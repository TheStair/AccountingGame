import { Scene } from "phaser";

// Default settings if no localStorage
const DEFAULT_SETTINGS = {
    difficulty: 1,
    volume: 1.0,
};

export class SettingsScene extends Scene {
    constructor() {
        super("SettingsScene");
    }

    create() {
        const { width, height } = this.scale;

        // Load stored or default volume
        this.volume = parseFloat(localStorage.getItem("volume"));
        if (isNaN(this.volume)) this.volume = DEFAULT_SETTINGS.volume;

        // Store volume globally
        this.game.sfxVolume = Math.max(0, Math.min(1, this.volume));

        // Sync music volume immediately (important after refresh)
        if (this.game.musicManager) {
            this.game.musicManager.setVolume(this.game.sfxVolume);
        }

        // Volume label
        this.add
            .text(40, 60, "Sound Volume", {
                fontFamily: "Arial",
                fontSize: "28px",
                color: "#ffffff",
                fontStyle: "bold",
                stroke: "#000000",
                strokeThickness: 2,
            })
            .setOrigin(0, 0);

        // Create Volume Slider
        this.volumeSlider = this.createVolumeSlider(40, 110);

        // Volume display
        this.volumeDisplay = this.add
            .text(40, 150, `Volume: ${(this.volume * 100).toFixed(0)}%`, {
                fontFamily: "Arial",
                fontSize: "20px",
                color: "#ffeb99",
                stroke: "#000000",
                strokeThickness: 2,
            })
            .setOrigin(0, 0);

        // Exit button
        const btnY = height - 80;
        const midX = width / 2;

        const exitBtn = this.createStyledButton(midX, btnY, "Exit", {
            backgroundColor: "#455a64",
            color: "#ffffff",
        });

        exitBtn.on("pointerdown", () => {
            this.confirmBox("Exit and save settings?", () => {
                // Save volume
                localStorage.setItem("volume", this.volume);

                // Update music volume immediately
                if (this.game.musicManager) {
                    this.game.musicManager.setVolume(this.volume);
                }

                // Update SFX volume
                this.game.sfxVolume = Math.max(0, Math.min(1, this.volume));

                // Play confirmation sound only if volume > 0
                if (this.game.sfxVolume > 0) {
                    this.sound.play("selection", {
                        volume: this.game.sfxVolume,
                    });
                }

                // Return to main menu
                this.scene.start("MainMenuScene");
            });
        });
    }

    createVolumeSlider(x, y) {
        const slider = this.add.dom(x, y).createFromHTML(`
            <input type="range" min="0" max="100" value="${
                this.volume * 100
            }" style="width: 200px;">
        `);
        slider.setOrigin(0, 0);

        slider.addListener("input");
        slider.on("input", (event) => {
            const val = parseFloat(event.target.value) / 100;
            this.volume = val;
            this.updateVolume();
        });

        return slider;
    }

    updateVolume() {
        if (this.volumeDisplay) {
            this.volumeDisplay.setText(
                `Volume: ${(this.volume * 100).toFixed(0)}%`
            );
        }
        if (this.game.musicManager) {
            this.game.musicManager.setVolume(this.volume);
        }
        this.game.sfxVolume = Math.max(0, Math.min(1, this.volume));
    }

    createStyledButton(x, y, label, styleOptions = {}) {
        const { backgroundColor = "#444", color = "#ffffff" } = styleOptions;

        return this.add
            .text(x, y, label, {
                fontFamily: "Arial",
                fontSize: "20px",
                color: color,
                backgroundColor: backgroundColor,
                padding: { x: 15, y: 8 },
            })
            .setOrigin(0.5)
            .setInteractive();
    }

    confirmBox(message, onConfirm) {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        const boxWidth = 400;
        const boxHeight = 180;

        const box = this.add
            .rectangle(centerX, centerY, boxWidth, boxHeight, 0x000000, 0.8)
            .setStrokeStyle(2, 0xffffff)
            .setDepth(9999);

        const text = this.add
            .text(centerX, centerY - 40, message, {
                fontFamily: "Arial",
                fontSize: "20px",
                color: "#ffffff",
                align: "center",
                wordWrap: { width: boxWidth - 40 },
                stroke: "#000000",
                strokeThickness: 2,
            })
            .setOrigin(0.5)
            .setDepth(9999);

        const yesBtn = this.add
            .text(centerX - 70, centerY + 30, "Yes", {
                fontFamily: "Arial",
                fontSize: "20px",
                color: "#00ff00",
                backgroundColor: "#333",
                padding: { x: 15, y: 6 },
            })
            .setOrigin(0.5)
            .setInteractive()
            .setDepth(9999);

        const noBtn = this.add
            .text(centerX + 70, centerY + 30, "No", {
                fontFamily: "Arial",
                fontSize: "20px",
                color: "#ff4444",
                backgroundColor: "#333",
                padding: { x: 15, y: 6 },
            })
            .setOrigin(0.5)
            .setInteractive()
            .setDepth(9999);

        const destroyPopup = () => {
            box.destroy();
            text.destroy();
            yesBtn.destroy();
            noBtn.destroy();
        };

        yesBtn.on("pointerdown", () => {
            destroyPopup();
            onConfirm();
        });

        noBtn.on("pointerdown", () => {
            destroyPopup();
        });
    }
}
