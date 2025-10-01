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
        this.game.playSFX = (scene, key, config = {}) => {
            scene.sound.play(key, {
                ...config,
                volume: this.game.sfxVolume,
            });
        };

        // Sync music immediately
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

        // Exit button (now just leaves the scene)
        const btnY = height - 80;
        const midX = width / 2;

        const exitBtn = this.createStyledButton(midX, btnY, "Exit", {
            backgroundColor: "#455a64",
            color: "#ffffff",
        });

        exitBtn.on("pointerdown", () => {
            this.game.playSFX(this, "selection");
            this.scene.start("MainMenuScene");
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
        // Update text
        if (this.volumeDisplay) {
            this.volumeDisplay.setText(
                `Volume: ${(this.volume * 100).toFixed(0)}%`
            );
        }

        localStorage.setItem("volume", this.volume);

        if (this.game.musicManager) {
            this.game.musicManager.setVolume(this.volume);
        }
        this.game.sfxVolume = Math.max(0, Math.min(1, this.volume));

        this.sound.sounds.forEach((sfx) => {
            if (sfx.isPlaying) {
                sfx.setVolume(this.game.sfxVolume);
            }
        });
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
}

