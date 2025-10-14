import { Scene } from "phaser";
import * as XLSX from "xlsx";

export class EquationScene extends Scene {
    constructor() {
        super("EquationScene");
    }

    init() {
        // ---- Level state ----
        this.currentLevel = null;        // 1 | 2 | 3 after selection
        this.currentQuestion = 0;
        this.questionsPerLevel = 10;     // requested: 10 questions per level

        // Time limit (seconds) — requested: 90 seconds per level
        this.levelTime = 90;

        // Score system (keep your per-level points from prior phases)
        this.levelPoints = { 1: 100, 2: 200, 3: 300 };
        this.score = 0;

        // Pools built from Excel (same sheets/logic as before)
        this.levelPools = { 1: [], 2: [], 3: [] };

        // Build pools from Excel (from cached binary "excelData")
        this.buildPoolsFromExcel();
    }

    create() {
        const { width, height } = this.scale;

        // Background
        this.add.rectangle(0, 0, width, height, 0x7f1a02).setOrigin(0);

        // Score (top-left)
        this.scoreText = this.add.text(20, 20, "Score: 0", {
            fontSize: "28px",
            fontFamily: '"Jersey 10", sans-serif',
            color: "#dcc89f",
        }).setOrigin(0, 0);

        // ESC → Pause
        const escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        escKey.on("down", () => {
            if (!this.scene.isActive("PauseScene")) {
                this.scene.launch("PauseScene", { parent: "EquationScene" });
                this.scene.bringToTop("PauseScene");
                this.scene.pause();
            }
        });

        // Start at Level Select (replaces the old Phase 1 intro)
        this.showLevelSelect();
    }

    // --------------------------------------------------------------------------------
    // Excel wiring
    // Level 1: Easy sheet — Question F4..F23, Answers fixed G/I/H/I in UI order [TL,TR,BL,BR]
    // Level 2: Medium sheet — Question G4..G23 (placeholder answers)
    // Level 3: Hard sheet   — Question G4..G23 (placeholder answers)
    // --------------------------------------------------------------------------------
    buildPoolsFromExcel() {
        try {
            const bin = this.cache.binary.get("excelData");
            if (!bin) {
                console.warn("EquationScene: no excelData in cache");
                return;
            }

            const wb = XLSX.read(bin, {
                type: "array",
                cellStyles: true,
                cellFormula: true,
                cellNF: true,
                cellDates: true,
                cellText: false,
                sheetStubs: true,
                cellComments: true,
            });

            // --- LEVEL 1 (Easy): F question; answers from G/I/H/I by on-screen order [TL,TR,BL,BR] ---
            this.levelPools[1] = this.extractFixedAnswers(
                wb.Sheets["A=L+SE - Easy"],
                {
                    qCol: "F",
                    start: 4,
                    end: 23,
                    // IMPORTANT: order here must match showQuestion's render order [0=TL, 1=TR, 2=BL, 3=BR]
                    addrOrderForRow: (r) => [`G${r}`, `I${r}`, `H${r}`, `J${r}`],
                }
            );

            // --- LEVEL 2 (Medium): G question ---
            this.levelPools[2] = this.extractQuestionOnly(
                wb.Sheets["A=L+SE - Medium"],
                { qCol: "G", start: 4, end: 23 }
            );

            // --- LEVEL 3 (Hard): G question ---
            this.levelPools[3] = this.extractQuestionOnly(
                wb.Sheets["A=L+SE - Hard"],
                { qCol: "G", start: 4, end: 23 }
            );
        } catch (e) {
            console.warn("EquationScene: Excel parse failed", e);
        }
    }

    // --------- NEW for Level 1: fixed-position answers pulled from Excel ----------
    extractFixedAnswers(sheet, cfg) {
        if (!sheet) return [];
        const out = [];

        for (let r = cfg.start; r <= cfg.end; r++) {
            // Question from F-row
            const q = this.cellToString(sheet[`${cfg.qCol}${r}`]);
            if (!q) continue;

            // Answers in fixed positions to match on-screen layout order [TL,TR,BL,BR]
            const addrs = cfg.addrOrderForRow(r);
            const answers = addrs.map(a => this.cellToString(sheet[a]) || "");

            // Detect correct index:
            // 1) cell comments containing "correct"
            let correctIndex = this.correctIndexFromComments(sheet, addrs);

            // 2) green-ish fill dominance
            if (correctIndex === -1) correctIndex = this.correctIndexFromGreenFill(sheet, addrs);

            // Fallback: top-left (index 0)
            if (correctIndex === -1) correctIndex = 0;

            out.push({ question: q, answers, correctIndex });
        }
        return out;
    }

    // ---------- (kept) OLD easy extractor, not used by Level 1 anymore ----------
    extractEasyPhase(sheet, cfg) {
        if (!sheet) return [];
        const out = [];

        for (let r = cfg.start; r <= cfg.end; r++) {
            const q = this.cellToString(sheet[`${cfg.qCol}${r}`]);
            if (!q) continue;

            const candVals = cfg.answerCols.map(col => this.cellToNumber(sheet[`${col}${r}`]));
            const candAddrs = cfg.answerCols.map(col => `${col}${r}`);

            let correctIdx = this.correctIndexFromMarker(sheet, cfg.markerCol, r);
            if (correctIdx === -1) correctIdx = this.correctIndexFromComments(sheet, candAddrs);
            if (correctIdx === -1) correctIdx = this.correctIndexFromGreenFill(sheet, candAddrs);

            if (correctIdx === -1) {
                correctIdx = candVals.findIndex(v => typeof v === "number" && !isNaN(v));
                if (correctIdx === -1) {
                    console.warn(`[Easy r${r}] No numeric answers in C/D/E; skipping`);
                    continue;
                }
                console.warn(`[Easy r${r}] Correct marker not found; using first numeric in C/D/E (idx ${correctIdx})`);
            }

            const correctVal = candVals[correctIdx];
            if (typeof correctVal !== "number" || isNaN(correctVal)) {
                console.warn(`[Easy r${r}] Selected correct cell is not numeric; skipping`);
                continue;
            }

            const decoys = this.generateDecoysNear(correctVal, 3);
            const answersRaw = [correctVal, ...decoys].map(n => this.formatNumber(n));

            const shuffled = answersRaw.slice();
            Phaser.Utils.Array.Shuffle(shuffled);
            const correctText = this.formatNumber(correctVal);
            const finalIdx = Math.max(0, shuffled.findIndex(a => a === correctText));

            out.push({
                question: q,
                answers: shuffled,
                correctIndex: finalIdx,
            });
        }

        return out;
    }

    // ---------- Level 2/3 placeholder extractor ----------
    extractQuestionOnly(sheet, cfg) {
        if (!sheet) return [];
        const out = [];
        for (let r = cfg.start; r <= cfg.end; r++) {
            const q = this.cellToString(sheet[`${cfg.qCol}${r}`]);
            if (!q) continue;

            // Placeholder answers until you define columns for Medium/Hard
            const answers = ["Option A", "Option B", "Option C", "Option D"];
            const correctIndex = Phaser.Math.Between(0, 3);

            out.push({ question: q, answers, correctIndex });
        }
        return out;
    }

    // ----- Helpers for detection / cell reading -----
    cellToString(cell) {
        if (!cell) return "";
        if (cell.w != null) return String(cell.w).trim();
        if (cell.v != null) return String(cell.v).trim();
        return "";
    }

    cellToNumber(cell) {
        if (!cell) return NaN;
        if (typeof cell.v === "number") return cell.v;
        if (typeof cell.v === "string") {
            const cleaned = cell.v.replace(/[, ]+/g, "");
            const n = parseFloat(cleaned);
            return isNaN(n) ? NaN : n;
        }
        return NaN;
    }

    correctIndexFromMarker(sheet, markerCol, row) {
        if (!markerCol) return -1;
        const marker = this.cellToString(sheet[`${markerCol}${row}`]).toUpperCase();
        if (!marker) return -1;

        if (marker === "C") return 0;
        if (marker === "D") return 1;
        if (marker === "E") return 2;

        if (marker === "1") return 0;
        if (marker === "2") return 1;
        if (marker === "3") return 2;

        return -1;
    }

    correctIndexFromComments(sheet, addrs) {
        for (let i = 0; i < addrs.length; i++) {
            const c = sheet[addrs[i]];
            const comments = c && c.c;
            if (!Array.isArray(comments)) continue;
            const hasCorrect = comments.some(cm =>
                typeof cm.t === "string" && cm.t.toLowerCase().includes("correct")
            );
            if (hasCorrect) return i;
        }
        return -1;
    }

    correctIndexFromGreenFill(sheet, addrs) {
        let bestIdx = -1;
        let bestScore = -Infinity;

        for (let i = 0; i < addrs.length; i++) {
            const c = sheet[addrs[i]];
            const score = this.greenScore(c);
            if (score > bestScore) {
                bestScore = score;
                bestIdx = i;
            }
        }
        return bestScore > 20 ? bestIdx : -1;
    }

    greenScore(cell) {
        try {
            const rgb =
                cell?.s?.fill?.fgColor?.rgb ||
                cell?.s?.fgColor?.rgb ||
                cell?.s?.bgColor?.rgb;
            if (!rgb || typeof rgb !== "string") return -Infinity;

            const hex = rgb.slice(-6);
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            return g - (r + b) / 2;
        } catch {
            return -Infinity;
        }
    }

    generateDecoysNear(correct, count) {
        const decoys = new Set();
        const abs = Math.max(1, Math.abs(correct));
        const stepBase = Math.pow(10, Math.max(0, Math.floor(Math.log10(abs)) - 1));

        while (decoys.size < count) {
            const pct = (5 + Math.random() * 20) / 100;
            const sign = Math.random() < 0.5 ? -1 : 1;
            let val = correct * (1 + sign * pct);

            const step = Math.max(1, Math.round(stepBase));
            val = Math.round(val / step) * step;

            if (val !== correct && val >= 0) decoys.add(val);
        }
        return Array.from(decoys);
    }

    formatNumber(n) {
        try { return Number(n).toLocaleString(); } catch { return String(n); }
    }

    // --------------------------------------------------------------------------------
    // Level flow (Level Select → countdown → timer → 10 questions → GameOver)
    // --------------------------------------------------------------------------------

    showLevelSelect() {
        const { width, height } = this.scale;

        // Title
        this.levelTitle = this.add.text(width / 2, height * 0.25, "Choose Level", {
            fontSize: "64px",
            fontFamily: '"Jersey 10", sans-serif',
            color: "#dcc89f",
            stroke: "#7f1a02",
            strokeThickness: 6
        }).setOrigin(0.5);

        // Buttons (Level 1/2/3)
        this.levelButtons = [];
        const labels = ["Level 1", "Level 2", "Level 3"];
        labels.forEach((label, idx) => {
            const y = height * 0.45 + idx * 110;
            const btn = this.makeButton(width / 2, y, 360, 80, label, () => {
                // On select
                this.currentLevel = idx + 1;
                this.cleanupLevelSelect();
                this.startLevelFlow();
            });
            this.levelButtons.push(btn);
        });
    }

    cleanupLevelSelect() {
        if (this.levelTitle) this.levelTitle.destroy();
        if (this.levelButtons) {
            this.levelButtons.forEach(b => { b.box.destroy(); b.text.destroy(); });
            this.levelButtons = null;
        }
    }

    makeButton(x, y, w, h, label, onClick) {
        const box = this.add.rectangle(x, y, w, h, 0xdcc89f)
            .setStrokeStyle(4, 0x7f1a02)
            .setInteractive({ useHandCursor: true });

        const text = this.add.text(x, y, label, {
            fontSize: "36px",
            fontFamily: '"Jersey 10", sans-serif',
            color: "#7f1a02",
        }).setOrigin(0.5);

        box.on("pointerover", () => box.setFillStyle(0xf5deb3));
        box.on("pointerout",  () => box.setFillStyle(0xdcc89f));
        box.on("pointerdown", () => onClick && onClick());

        return { box, text };
    }

    startLevelFlow() {
        // Prepare questions for this level and show the little intro card + countdown
        this.prepareLevelQuestions();
        this.showLevelIntro();
    }

    // Prepare randomized 10-question set for selected level
    prepareLevelQuestions() {
        const pool = (this.levelPools[this.currentLevel] || []).slice();
        Phaser.Utils.Array.Shuffle(pool);
        this.levelQuestions = pool.slice(0, this.questionsPerLevel);

        if (this.levelQuestions.length === 0) {
            // Fallback stubs
            this.levelQuestions = Array.from({ length: this.questionsPerLevel }, (_, i) => ({
                question: `Question ${i + 1} of Level ${this.currentLevel}`,
                answers: ["Option A", "Option B", "Option C", "Option D"],
                correctIndex: Phaser.Math.Between(0, 3)
            }));
        }
    }

    // --- Level Intro (small card) ---
    showLevelIntro() {
        const { width, height } = this.scale;

        this.currentQuestion = 0;

        this.levelBox = this.add.rectangle(width / 2, height / 2, 420, 220, 0xdcc89f)
            .setStrokeStyle(4, 0x7f1a02)
            .setDepth(5);

        this.levelText = this.add.text(width / 2, height / 2, `Level ${this.currentLevel}`, {
            fontSize: "48px",
            fontFamily: '"Jersey 10", sans-serif',
            color: "#7f1a02",
        }).setOrigin(0.5).setDepth(6);

        this.tweens.add({
            targets: [this.levelBox, this.levelText],
            alpha: 0,
            delay: 1200,
            duration: 900,
            onComplete: () => {
                this.levelBox.destroy();
                this.levelText.destroy();
                this.startCountdown();
            }
        });
    }

    // --- 3..2..1 countdown ---
    startCountdown() {
        const { width, height } = this.scale;
        let count = 3;

        this.countdownText = this.add.text(width / 2, height / 2, count, {
            fontSize: "96px",
            fontFamily: '"Jersey 10", sans-serif',
            color: "#dcc89f",
            stroke: "#7f1a02",
            strokeThickness: 6
        }).setOrigin(0.5);

        this.time.addEvent({
            delay: 1000,
            repeat: 2,
            callback: () => {
                count--;
                if (count > 0) {
                    this.countdownText.setText(count);
                } else {
                    this.countdownText.destroy();
                    this.startLevelTimer();
                    this.showQuestion();
                }
            }
        });
    }

    // --- Start 90s level timer ---
    startLevelTimer() {
        const { width, height } = this.scale;
        let timeLeft = this.levelTime; // 90 seconds

        if (this.timerEvent) this.timerEvent.remove();
        if (this.timerText) this.timerText.destroy();

        this.timerText = this.add.text(width / 2, height / 5 - 50, this.formatTime(timeLeft), {
            fontSize: "32px",
            fontFamily: '"Jersey 10", sans-serif',
            color: "#dcc89f",
            stroke: "#7f1a02",
            strokeThickness: 4
        }).setOrigin(0.5);

        this.timerEvent = this.time.addEvent({
            delay: 1000,
            repeat: timeLeft - 1,
            callback: () => {
                timeLeft--;
                this.timerText.setText(this.formatTime(timeLeft));
                if (timeLeft <= 0) this.endLevel();
            }
        });
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const partInSeconds = seconds % 60;
        return `${minutes}:${partInSeconds.toString().padStart(2, "0")}`;
    }

    // --- Show a question with 2x2 answers ---
    showQuestion() {
        const { width, height } = this.scale;

        const item = this.levelQuestions?.[this.currentQuestion];
        const questionText = item?.question ?? `Question ${this.currentQuestion + 1} of Level ${this.currentLevel}`;
        const answers = item?.answers ?? ["Option A", "Option B", "Option C", "Option D"];
        const correctIndex = typeof item?.correctIndex === "number" ? item.correctIndex : Phaser.Math.Between(0, 3);

        // Question box
        this.questionBox = this.add.rectangle(width / 2, height / 4, width * 0.8, 100, 0xdcc89f)
            .setStrokeStyle(3, 0x7f1a02);

        this.questionText = this.add.text(width / 2, height / 4, questionText, {
            fontSize: "28px",
            fontFamily: '"Jersey 10", sans-serif',
            color: "#7f1a02",
            wordWrap: { width: width * 0.75 }
        }).setOrigin(0.5);

        // 2x2 grid
        this.answerButtons = [];
        const colX = [width / 4, (3 * width) / 4];
        const rowY = [height / 2, height / 2 + 120];

        answers.forEach((answer, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const btnX = colX[col];
            const btnY = rowY[row];

            const border = this.add.rectangle(btnX, btnY, 350, 70, 0xdcc89f)
                .setStrokeStyle(3, 0x7f1a02)
                .setInteractive({ useHandCursor: true });

            const text = this.add.text(btnX, btnY, String(answer), {
                fontSize: "22px",
                fontFamily: '"Jersey 10", sans-serif',
                color: "#7f1a02",
            }).setOrigin(0.5);

            border.on("pointerover", () => {
                if (!this.answered) border.setFillStyle(0xf5deb3);
            });
            border.on("pointerout", () => {
                if (!this.answered) border.setFillStyle(0xdcc89f);
            });

            border.on("pointerdown", () => {
                if (this.answered) return;
                this.answered = true;

                if (i === correctIndex) {
                    border.setFillStyle(0x00aa00);
                    this.score += this.levelPoints[this.currentLevel] ?? 100;
                    this.scoreText.setText("Score: " + this.score);
                } else {
                    border.setFillStyle(0xaa0000);
                }

                // Disable others
                this.answerButtons.forEach((btn, idx) => {
                    if (idx !== i) btn.border.disableInteractive();
                });

                this.time.delayedCall(1000, () => this.nextQuestion());
            });

            this.answerButtons.push({ border, text });
        });

        this.answered = false;
    }

    // --- Next Question ---
    nextQuestion() {
        if (this.questionBox) this.questionBox.destroy();
        if (this.questionText) this.questionText.destroy();
        if (this.answerButtons) {
            this.answerButtons.forEach(btn => {
                btn.border.destroy();
                btn.text.destroy();
            });
        }

        this.currentQuestion++;

        if (this.currentQuestion < this.questionsPerLevel) {
            this.showQuestion();
        } else {
            this.endLevel();
        }
    }

    // --- End of Level (go straight to Game Over) ---
    endLevel() {
        if (this.questionBox) this.questionBox.destroy();
        if (this.questionText) this.questionText.destroy();
        if (this.answerButtons) {
            this.answerButtons.forEach(btn => {
                btn.border.destroy();
                btn.text.destroy();
            });
        }

        if (this.timerEvent) this.timerEvent.remove();
        if (this.timerText) this.timerText.destroy();

        // No auto-advance — we’re done after chosen level
        this.scene.start("GameOverScene", { score: this.score });
    }
}
