import { Scene } from "phaser";

export class MainMenuScene extends Scene {
    constructor() {
        super("MainMenuScene");
    }

    init() {
        this.cameras.main.fadeIn(1000, 0, 0, 0);
    }

    create() {
        const { width, height } = this.scale;

        // Restore global SFX/music volume
        this.game.sfxVolume = parseFloat(localStorage.getItem("volume"));
        if (isNaN(this.game.sfxVolume)) this.game.sfxVolume = 1.0;

        // --- Background ---
        this.add
            .image(width / 2, height / 2, "home_bg")
            .setOrigin(0.5)
            .setDisplaySize(width, height)
            .setDepth(0);

        // --- Clouds ---
        this.clouds = this.add
            .image(width / 2, height / 2 - 50, "home_clouds")
            .setOrigin(0.5)
            .setScale(0.5)
            .setDepth(1);

        this.cloudSpeed = 0.3;

        // --- Overlay text ---
        this.add
            .image(width / 2, height / 2 + 80, "home_text")
            .setOrigin(0.5)
            .setDepth(2)
            .setScale(0.8);

        // --- Music ---
        if (this.sound.locked) {
            this.sound.once("unlocked", () => {
                this.game.musicManager.setVolume(this.game.sfxVolume ?? 1.0);
                this.game.musicManager.play(this, "menu_bgm");
            });
        } else {
            this.game.musicManager.setVolume(this.game.sfxVolume ?? 1.0);
            this.game.musicManager.play(this, "menu_bgm");
        }

        // --- Buttons ---
        const options = ["debit_credit", "accounting", "settings"];
        const selectedOptions = { type: "debit_credit" };

        const get_option_text = (option) => {
            if (option === "debit_credit") return "Debit vs Credit";
            if (option === "accounting") return "The Five Building Blocks";
            if (option === "settings") return "Settings";
        };

        const createButton = (x, y, labelText, onClick) => {
            const border = this.add.rectangle(0, 0, 304, 64, 0xdcc89f).setDepth(3);
            const rect = this.add.rectangle(0, 0, 300, 60, 0x7f1a02).setDepth(3);
            const label = this.add
                .text(0, 0, labelText, {
                    fontSize: "24px",
                    fontFamily: '"Jersey 10", sans-serif',
                    color: "#dcc89f",
                })
                .setOrigin(0.5)
                .setDepth(3);

            const button = this.add.container(x, y, [border, rect, label]).setDepth(3);

            rect.setInteractive({ useHandCursor: true });

            rect.on("pointerover", () => {
                rect.setFillStyle(0xa8321a);
                this.tweens.add({
                    targets: button,
                    scale: 1.05,
                    duration: 150,
                    ease: "Power1",
                });
            });

            rect.on("pointerout", () => {
                rect.setFillStyle(0x7f1a02);
                this.tweens.add({
                    targets: button,
                    scale: 1,
                    duration: 150,
                    ease: "Power1",
                });
            });

            rect.on("pointerdown", () => {
                if (this.game.sfxVolume > 0) {
                    this.sound.play("selection", { volume: this.game.sfxVolume });
                }
                const tween = this.tweens.add({
                    targets: button,
                    scale: 0.9,
                    duration: 80,
                    yoyo: true,
                    ease: "Power1",
                });
                tween.once("complete", onClick);
            });

            return button;
        };

        const totalButtons = options.length;
        const spacing = 100;
        const blockHeight = (totalButtons - 1) * spacing;
        const startY = height / 2 - blockHeight / 2;

        options.forEach((option, index) => {
            createButton(
                width / 2,
                startY + index * spacing,
                get_option_text(option),
                () => {
                    if (option === "settings") {
                        this.scene.start("SettingsScene");
                    } else {
                        selectedOptions.type = option;

                        // 🔧 stop menu music cleanly before switching
                        if (this.game.musicManager) {
                            this.game.musicManager.stop();
                        }

                        this.startGame(selectedOptions);
                    }
                }
            );
        });
    }

    update() {
        if (this.clouds) {
            this.clouds.x -= this.cloudSpeed;
            if (this.clouds.x < -this.clouds.displayWidth / 2) {
                this.clouds.x = this.scale.width + this.clouds.displayWidth / 2;
            }
        }
    }

    startGame(selectedOptions) {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once("camerafadeoutcomplete", () => {
            this.scene.start("MainScene", { type: selectedOptions.type });
        });
    }
}
