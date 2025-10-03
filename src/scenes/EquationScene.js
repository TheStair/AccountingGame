import { Scene } from "phaser";
import * as XLSX from "xlsx";

export class EquationScene extends Scene {
    constructor() {
        super("EquationScene");
    }

    init() {
        this.currentPhase = 1;
        this.currentQuestion = 0;
        this.totalPhases = 3;
        this.questionsPerPhase = 5;

        // Phase time limits (seconds)
        this.phaseTimes = { 1: 60, 2: 120, 3: 180 };

        // Score system by phase
        this.phasePoints = { 1: 100, 2: 200, 3: 300 };

        this.score = 0;

        // Pools built from Excel for each phase
        this.phasePools = { 1: [], 2: [], 3: [] };

        // Build pools from Excel
        this.buildPoolsFromExcel();
    }

    create() {
        const { width, height } = this.scale;

        // Background
        this.add.rectangle(0, 0, width, height, 0x7f1a02).setOrigin(0);

        // Score text (top-left)
        this.scoreText = this.add.text(20, 20, "Score: 0", {
            fontSize: "28px",
            fontFamily: '"Jersey 10", sans-serif',
            color: "#dcc89f",
        }).setOrigin(0, 0);

        // --- ESC → PauseScene hookup ---
        const escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        escKey.on("down", () => {
            if (!this.scene.isActive("PauseScene")) {
                this.scene.launch("PauseScene", { parent: "EquationScene" });
                this.scene.bringToTop("PauseScene");
                this.scene.pause();
            }
        });

        // Start with Phase Intro
        this.showPhaseIntro();
    }

    // --------------------------------------------------------------------------------
    // Excel wiring
    // Phase 1: F question, correct is green-highlighted among C/D/E (or H marker/comment)
    // Phase 2: G question (Medium)
    // Phase 3: G question (Hard)
    // --------------------------------------------------------------------------------
    buildPoolsFromExcel() {
        try {
            const bin = this.cache.binary.get("excelData");
            if (!bin) {
                console.warn("EquationScene: no excelData in cache");
                return;
            }

            // Enable style + comment reading to improve green / "correct" detection
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

            // --- PHASE 1 (Easy): F question, green among C/D/E is correct ---
            this.phasePools[1] = this.extractEasyPhase(
                wb.Sheets["A=L+SE - Easy"],
                { qCol: "F", start: 4, end: 23, answerCols: ["C", "D", "E"], markerCol: "H" } // H is optional helper marker
            );

            // --- PHASE 2 (Medium): G question ---
            this.phasePools[2] = this.extractQuestionOnly(
                wb.Sheets["A=L+SE - Medium"],
                { qCol: "G", start: 4, end: 23 }
            );

            // --- PHASE 3 (Hard): G question ---
            this.phasePools[3] = this.extractQuestionOnly(
                wb.Sheets["A=L+SE - Hard"],
                { qCol: "G", start: 4, end: 23 }
            );
        } catch (e) {
            console.warn("EquationScene: Excel parse failed", e);
        }
    }

    extractEasyPhase(sheet, cfg) {
        if (!sheet) return [];
        const out = [];

        for (let r = cfg.start; r <= cfg.end; r++) {
            const q = this.cellToString(sheet[`${cfg.qCol}${r}`]);
            if (!q) continue;

            // Grab numeric candidates from C/D/E
            const candVals = cfg.answerCols.map(col => this.cellToNumber(sheet[`${col}${r}`]));
            const candAddrs = cfg.answerCols.map(col => `${col}${r}`);

            // 1) Try explicit marker column (H) if present: C/D/E or 1/2/3
            let correctIdx = this.correctIndexFromMarker(sheet, cfg.markerCol, r);

            // 2) Try cell comments containing "correct"
            if (correctIdx === -1) {
                correctIdx = this.correctIndexFromComments(sheet, candAddrs);
            }

            // 3) Try fill color (green-ish)
            if (correctIdx === -1) {
                correctIdx = this.correctIndexFromGreenFill(sheet, candAddrs);
            }

            // 4) Fallback: first numeric value
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

            // Generate 3 decoys near the correct value (unique, non-negative, != correct)
            const decoys = this.generateDecoysNear(correctVal, 3);
            const answersRaw = [correctVal, ...decoys].map(n => this.formatNumber(n));

            // Shuffle and compute new correct index
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

    // ----- Helpers for detection -----
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

        // Accept "C", "D", "E"
        if (marker === "C") return 0;
        if (marker === "D") return 1;
        if (marker === "E") return 2;

        // Accept 1/2/3 (1-based)
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

        // Require the green dominance to be meaningful
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
            // Score by G - average(R,B)
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
            const pct = (5 + Math.random() * 20) / 100; // 5–25%
            const sign = Math.random() < 0.5 ? -1 : 1;
            let val = correct * (1 + sign * pct);

            // Round to a friendly step
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
    // Your existing flow (unchanged): phase intro → countdown → timer → questions
    // --------------------------------------------------------------------------------

    // Prepare a fresh, randomized set of 5 questions for the current phase
    preparePhaseQuestions() {
        const pool = (this.phasePools[this.currentPhase] || []).slice();
        Phaser.Utils.Array.Shuffle(pool);
        this.phaseQuestions = pool.slice(0, this.questionsPerPhase);

        if (this.phaseQuestions.length === 0) {
            // Fallback stubs
            this.phaseQuestions = Array.from({ length: this.questionsPerPhase }, (_, i) => ({
                question: `Question ${i + 1} of Phase ${this.currentPhase}`,
                answers: ["Option A", "Option B", "Option C", "Option D"],
                correctIndex: Phaser.Math.Between(0, 3)
            }));
        }
    }

    // --- Phase Intro ---
    showPhaseIntro() {
        const { width, height } = this.scale;

        // New phase → build the randomized list for this phase
        this.preparePhaseQuestions();

        this.phaseBox = this.add.rectangle(width / 2, height / 2, 400, 200, 0xdcc89f)
            .setStrokeStyle(4, 0x7f1a02)
            .setDepth(5);

        this.phaseText = this.add.text(width / 2, height / 2, `Phase ${this.currentPhase}`, {
            fontSize: "48px",
            fontFamily: '"Jersey 10", sans-serif',
            color: "#7f1a02",
        }).setOrigin(0.5).setDepth(6);

        this.tweens.add({
            targets: [this.phaseBox, this.phaseText],
            alpha: 0,
            delay: 1500,
            duration: 1000,
            onComplete: () => {
                this.phaseBox.destroy();
                this.phaseText.destroy();
                this.startCountdown();
            }
        });
    }

    // --- Countdown before phase ---
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
                    this.startPhaseTimer();
                    this.showQuestion();
                }
            }
        });
    }

    // --- Start phase timer ---
    startPhaseTimer() {
        const { width, height } = this.scale;
        let timeLeft = this.phaseTimes[this.currentPhase];

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
                if (timeLeft <= 0) this.endPhase();
            }
        });
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const partInSeconds = seconds % 60;
        return `${minutes}:${partInSeconds.toString().padStart(2, "0")}`;
    }

    // --- Show a question with 2x2 answers (from prepared pool) ---
    showQuestion() {
        const { width, height } = this.scale;

        const item = this.phaseQuestions?.[this.currentQuestion];
        const questionText = item?.question ?? `Question ${this.currentQuestion + 1} of Phase ${this.currentPhase}`;
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
                    border.setFillStyle(0x00aa00); // green
                    this.score += this.phasePoints[this.currentPhase];
                    this.scoreText.setText("Score: " + this.score);
                } else {
                    border.setFillStyle(0xaa0000); // red
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

        if (this.currentQuestion < this.questionsPerPhase) {
            this.showQuestion();
        } else {
            this.endPhase();
        }
    }

    // --- End of Phase ---
    endPhase() {
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

        this.currentPhase++;
        this.currentQuestion = 0;
        this.phaseQuestions = null; // re-randomize next phase

        if (this.currentPhase <= this.totalPhases) {
            this.showPhaseIntro();
        } else {
            this.scene.start("GameOverScene", { score: this.score });
        }
    }
}
