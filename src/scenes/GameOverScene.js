import { Scene } from "phaser";

export class GameOverScene extends Scene {
    end_points = 0;

    constructor() {
        super("GameOverScene");
    }

    init(data) {
        this.end_points = data.points || 0;
        this.gameKey = data.gameKey || "game1"; // pass the game key from your game scene
    }

    async create() {
        // --- Background + Text Setup ---
        this.add.image(0, 0, "background").setOrigin(0, 0);

        this.add.rectangle(
        this.scale.width / 2,   // center X
        this.scale.height / 2,  // center Y
        this.scale.width,       // full width
        this.scale.height,      // full height
        0x000000,               // black
        0.6                     // opacity (0 = transparent, 1 = solid)
        ).setOrigin(0.5);

        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        this.add
            .bitmapText(centerX, centerY - 60, "knighthawks", "GAME OVER", 64)
            .setOrigin(0.5);

        const scoreText = this.add
            .bitmapText(centerX, centerY, "pixelfont", `Your Score: ${this.end_points}`, 28)
            .setOrigin(0.5);

        // --- Check if player qualifies ---
        try {
            const previewRes = await fetch(
                `${this.game.apiBaseUrl}/preview?game=${this.gameKey}&score=${this.end_points}`
            );
            const result = await previewRes.json();

            if (result.qualifies) {
                this.showQualificationUI(centerX, centerY + 60, result.preview_rank);
            } else {
                this.add
                    .bitmapText(centerX, centerY + 60, "pixelfont", "You did not make the leaderboard.", 24)
                    .setOrigin(0.5)
                    .setTint(0xff5555);
            }
        } catch (err) {
            console.error("Error checking leaderboard preview:", err);
            this.add
                .bitmapText(centerX, centerY + 60, "pixelfont", "Error connecting to leaderboard.", 24)
                .setOrigin(0.5)
                .setTint(0xff5555);
        }

        // --- Buttons ---
        this.createMenuButtons(centerX, centerY + 150);
    }

    showQualificationUI(centerX, centerY, rank) {
        // Success message
        this.add
            .bitmapText(centerX, centerY, "pixelfont", `🎉 You made the leaderboard! Rank #${rank}`, 26)
            .setOrigin(0.5)
            .setTint(0x00ff88);

        this.add
            .bitmapText(centerX, centerY + 40, "pixelfont", "Enter your initials:", 24)
            .setOrigin(0.5);

        // Text input (simplest Phaser method: DOM element)
        const input = this.add.dom(centerX, centerY + 80, "input", {
            type: "text",
            maxlength: 3,
            fontSize: "24px",
            textAlign: "center",
            textTransform: "uppercase",
            width: "80px",
        });
        input.node.style.textTransform = "uppercase";

        // Submit button
        const submitBtn = this.add
            .text(centerX, centerY + 130, "Submit", {
                fontSize: "28px",
                color: "#ffffff",
                backgroundColor: "#007755",
                padding: { x: 10, y: 5 },
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        submitBtn.on("pointerdown", async () => {
            const username = input.node.value.toUpperCase().slice(0, 3) || "AAA";

            try {
                const res = await fetch(`${this.game.apiBaseUrl}/submit`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        game: this.gameKey,
                        username,
                        score: this.end_points,
                    }),
                });

                if (!res.ok) throw new Error(`Submit failed (${res.status})`);

                const result = await res.json();

                // ✅ Optional visual feedback before switching scenes
                this.add
                    .bitmapText(centerX, centerY + 180, "pixelfont", "Score submitted!", 24)
                    .setOrigin(0.5)
                    .setTint(0x00ff00);

                // ✅ Slight delay for polish (so the player sees confirmation)
                this.time.delayedCall(1000, () => {
                    // Move to Leaderboard scene
                    this.scene.start("Leaderboard", {
                        gameKey: this.gameKey,   // so leaderboard knows which mode to show
                        highlightName: username, // optional: highlight the new entry
                    });
                });

            } catch (err) {
                console.error("Error submitting score:", err);
                this.add
                    .bitmapText(centerX, centerY + 180, "pixelfont", "Submission failed.", 24)
                    .setOrigin(0.5)
                    .setTint(0xff0000);
            }
        });
    }

    createMenuButtons(centerX, baseY) {
        const buttonStyle = {
            fontSize: "30px",
            color: "#ffffff",
            padding: { left: 10, right: 10, top: 5, bottom: 5 },
            backgroundColor: "#333333",
        };

        const playAgain = this.add.text(centerX - 150, baseY, "Play Again", buttonStyle).setOrigin(0.5);
        const mainMenu = this.add.text(centerX + 150, baseY, "Main Menu", buttonStyle).setOrigin(0.5);

        playAgain.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
            this.scene.start("MainScene");
        });

        mainMenu.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
            this.scene.start("MainMenuScene");
        });
    }
}