import { Scene } from "phaser";

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
        this.phaseTimes = {
            1: 60,
            2: 120,
            3: 180
        };

        // Score system by phase
        this.phasePoints = {
            1: 100,
            2: 200,
            3: 300
        };

        this.score = 0;

        // Will hold the 5 randomized questions for the current phase
        this.phaseQuestions = null;
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

    // Prepare a fresh, randomized set of 5 questions for the current phase
    preparePhaseQuestions() {
        const key = `phase${this.currentPhase}`;
        const all = (this.game.questionData && this.game.questionData[key]) ? [...this.game.questionData[key]] : [];

        // Shuffle and take up to questionsPerPhase
        Phaser.Utils.Array.Shuffle(all);
        this.phaseQuestions = all.slice(0, this.questionsPerPhase);

        // Fallback if the sheet was empty for some reason
        if (this.phaseQuestions.length === 0) {
            this.phaseQuestions = Array.from({ length: this.questionsPerPhase }, (_, i) => `Question ${i + 1}`);
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

        // If old timer exists, clear it
        if (this.timerEvent) this.timerEvent.remove();
        if (this.timerText) this.timerText.destroy();

        // Show timer above question area (centered)
        this.timerText = this.add.text(width / 2, height / 5 - 50, this.formatTime(timeLeft), {
            fontSize: "32px",
            fontFamily: '"Jersey 10", sans-serif',
            color: "#dcc89f",
            stroke: "#7f1a02",
            strokeThickness: 4
        }).setOrigin(0.5);

        // Countdown logic
        this.timerEvent = this.time.addEvent({
            delay: 1000,
            repeat: timeLeft - 1,
            callback: () => {
                timeLeft--;
                this.timerText.setText(this.formatTime(timeLeft));

                if (timeLeft <= 0) {
                    this.endPhase();
                }
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

        // Pull question text from our pre-randomized list for the phase
        const questionText = this.phaseQuestions[this.currentQuestion] ?? `Question ${this.currentQuestion + 1} of Phase ${this.currentPhase}`;

        // Question box
        this.questionBox = this.add.rectangle(width / 2, height / 4, width * 0.8, 100, 0xdcc89f)
            .setStrokeStyle(3, 0x7f1a02);

        this.questionText = this.add.text(width / 2, height / 4, questionText, {
            fontSize: "28px",
            fontFamily: '"Jersey 10", sans-serif',
            color: "#7f1a02",
            wordWrap: { width: width * 0.75 }
        }).setOrigin(0.5);

        // --- 2x2 answer grid (kept exactly like your layout) ---
        // For now we still use placeholder answers; once answers exist in Excel,
        // we’ll replace this with the real options.
        const answers = ["Option A", "Option B", "Option C", "Option D"];
        const correctIndex = Phaser.Math.Between(0, 3); // placeholder correctness

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

            const text = this.add.text(btnX, btnY, answer, {
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
                if (this.answered) return; // prevent multiple answers
                this.answered = true;

                if (i === correctIndex) {
                    border.setFillStyle(0x00aa00); // green
                    this.score += this.phasePoints[this.currentPhase];
                    this.scoreText.setText("Score: " + this.score);
                } else {
                    border.setFillStyle(0xaa0000); // red
                }

                // Disable other buttons
                this.answerButtons.forEach((btn, idx) => {
                    if (idx !== i) {
                        btn.border.disableInteractive();
                    }
                });

                // Move to next question after short delay
                this.time.delayedCall(1000, () => {
                    this.nextQuestion();
                });
            });

            this.answerButtons.push({ border, text });
        });

        this.answered = false;
    }

    // --- Next Question ---
    nextQuestion() {
        // Clear current question UI
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
        // Clear UI
        if (this.questionBox) this.questionBox.destroy();
        if (this.questionText) this.questionText.destroy();
        if (this.answerButtons) {
            this.answerButtons.forEach(btn => {
                btn.border.destroy();
                btn.text.destroy();
            });
        }

        // Clear timer
        if (this.timerEvent) this.timerEvent.remove();
        if (this.timerText) this.timerText.destroy();

        // Prepare for next phase
        this.currentPhase++;
        this.currentQuestion = 0;
        this.phaseQuestions = null; // force re-randomize next phase’s questions

        if (this.currentPhase <= this.totalPhases) {
            this.showPhaseIntro();
        } else {
            this.scene.start("GameOverScene", { score: this.score });
        }
    }
}
