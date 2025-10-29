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

        // --- Restore global SFX/music volume ---
        this.game.sfxVolume = parseFloat(localStorage.getItem("volume"));
        if (isNaN(this.game.sfxVolume)) this.game.sfxVolume = 1.0;

        // --- Background ---
        this.add
            .image(width / 2, height / 2, "home_bg")
            .setOrigin(0.5)
            .setDisplaySize(width, height)
            .setDepth(0);

        // --- Clouds (single sprite, Pac-Man wrap) ---
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
        const setMusic = () => {
            this.game.musicManager.setVolume(this.game.sfxVolume ?? 1.0);
            this.game.musicManager.play(this, "menu_bgm");
        };
        if (this.sound.locked) {
            this.sound.once("unlocked", setMusic);
        } else {
            setMusic();
        }

        // --- Menu Buttons ---
        const options = ["debit_credit", "accounting", "gamemode3"];
        const selectedOptions = { type: "debit_credit" };

        const get_option_text = (option) => {
            if (option === "debit_credit") return "Debit vs Credit";
            if (option === "accounting") return "The Five Elements";
            if (option === "gamemode3") return "Accounting Equation";
            return option;
        };

        const createButton = (x, y, labelText, onClick) => {
            const border = this.add
                .rectangle(0, 0, 304, 64, 0x7f1a02)
                .setDepth(3);
            border.setStrokeStyle(3, 0xdcc89f);

            const rect = this.add
                .rectangle(0, 0, 300, 60, 0x7f1a02)
                .setDepth(3);

            const label = this.add
                .text(0, 0, labelText, {
                    fontSize: "24px",
                    fontFamily: '"Jersey 10", sans-serif',
                    color: "#dcc89f",
                })
                .setOrigin(0.5)
                .setDepth(3);

            const button = this.add
                .container(x, y, [border, rect, label])
                .setDepth(3);

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
                    this.sound.play("selection", {
                        volume: this.game.sfxVolume,
                    });
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
                    selectedOptions.type = option;
                    if (this.game.musicManager) this.game.musicManager.stop();
                    if (option === "gamemode3") {
                        this.startGameMode3();
                    } else {
                        this.startGame(selectedOptions);
                    }
                }
            );
        });

        // --- Icon constants ---
        const ICON_Y = 40; // consistent vertical alignment
        const ICON_MARGIN = 50;

        // --- Volume Button (top-left) ---
        this.volumeButton = this.add
            .circle(ICON_MARGIN, ICON_Y, 20, 0x7f1a02)
            .setDepth(5)
            .setInteractive();
        this.volumeButton.setStrokeStyle(2, 0xdcc89f);

        // --- Volume Icon ---
        this.volumeIcon = this.add
            .image(ICON_MARGIN, ICON_Y, "volumeIcon")
            .setDisplaySize(24, 24)
            .setDepth(6);

        // Hover effect for volume button
        this.volumeButton.on("pointerover", () => {
            this.volumeButton.setFillStyle(0xa8321a);
        });
        this.volumeButton.on("pointerout", () => {
            this.volumeButton.setFillStyle(0x7f1a02);
        });
        this.volumeButton.on("pointerdown", () => {
            this.toggleVolumeSlider();
        });

        // --- Leaderboard Icon (top-right, same height as volume icon) ---
        const BASE_SCALE = 0.05;
        const HOVER_SCALE = BASE_SCALE * 1.15;

        const leader_icon = this.add
            .image(width - ICON_MARGIN, ICON_Y, "leaderboardIcon")
            .setInteractive({ useHandCursor: true })
            .setScale(BASE_SCALE)
            .setOrigin(0.5)
            .setDepth(5);

        leader_icon.on("pointerover", () => {
            this.tweens.killTweensOf(leader_icon);
            this.tweens.add({
                targets: leader_icon,
                scale: HOVER_SCALE,
                duration: 120,
                ease: "Sine.easeOut",
            });
            leader_icon.setTint(0xffffff);
        });

        leader_icon.on("pointerout", () => {
            this.tweens.killTweensOf(leader_icon);
            this.tweens.add({
                targets: leader_icon,
                scale: BASE_SCALE,
                duration: 120,
                ease: "Sine.easeIn",
            });
            leader_icon.clearTint();
        });

        leader_icon.on("pointerdown", () => {
            this.tweens.killTweensOf(leader_icon);
            this.tweens.add({
                targets: leader_icon,
                scale: BASE_SCALE * 0.92,
                duration: 70,
                yoyo: true,
                ease: "Sine.easeInOut",
                onComplete: () => this.scene.start("Leaderboard"),
            });
        });
    }

    update() {
        if (this.clouds) {
            this.clouds.x -= this.cloudSpeed;

            // Pac-Man wrap
            if (this.clouds.x + this.clouds.displayWidth / 2 < 0) {
                this.clouds.x = this.scale.width + this.clouds.displayWidth / 2;
            }
            if (
                this.clouds.x - this.clouds.displayWidth / 2 >
                this.scale.width
            ) {
                this.clouds.x = -this.clouds.displayWidth / 2;
            }
        }
    }

    startGame(selectedOptions) {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once("camerafadeoutcomplete", () => {
            this.scene.start("MainScene", { type: selectedOptions.type });
        });
    }

    startGameMode3() {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once("camerafadeoutcomplete", () => {
            this.scene.start("GM3LevelSelect");
        });
    }

    toggleVolumeSlider() {
        if (this.volumeSliderBox) {
            this.volumeSliderBox.destroy();
            this.volumeSliderTrack.destroy();
            this.volumeSliderKnob.destroy();
            this.volumeSliderBox = null;
            this.volumeSliderTrack = null;
            this.volumeSliderKnob = null;
        } else {
            const boxWidth = 40;
            const boxHeight = 120;
            const boxX = this.volumeButton.x;
            const boxY = this.volumeButton.y + boxHeight / 2 + 30;

            this.volumeSliderBox = this.add
                .rectangle(boxX, boxY, boxWidth, boxHeight, 0x7f1a02)
                .setOrigin(0.5)
                .setDepth(3)
                .setStrokeStyle(2, 0xdcc89f);

            const sliderX = boxX;
            const sliderY = boxY;
            this.volumeSliderTrack = this.add
                .rectangle(sliderX, sliderY, 4, 100, 0xdcc89f)
                .setDepth(4);

            let knobY = sliderY + 50 - this.game.sfxVolume * 100;
            this.volumeSliderKnob = this.add
                .circle(sliderX, knobY, 8, 0xdcc89f)
                .setDepth(5)
                .setInteractive({ draggable: true });

            this.volumeSliderKnob.setStrokeStyle(2, 0x7f1a02);
            this.input.setDraggable(this.volumeSliderKnob);

            this.volumeSliderKnob.on("pointerover", () => {
                this.volumeSliderKnob.setFillStyle(0xf5deb3);
            });
            this.volumeSliderKnob.on("pointerout", () => {
                this.volumeSliderKnob.setFillStyle(0xdcc89f);
            });

            this.volumeSliderKnob.on("drag", (pointer, dragX, dragY) => {
                const clampedY = Phaser.Math.Clamp(
                    dragY,
                    sliderY - 50,
                    sliderY + 50
                );
                this.volumeSliderKnob.y = clampedY;

                const newVolume = 1 - (clampedY - (sliderY - 50)) / 100;
                this.game.sfxVolume = newVolume;
                localStorage.setItem("volume", newVolume);
                this.sound.volume = newVolume;
                this.game.musicManager.setVolume(newVolume);
            });
        }
    }
}

