import { Scene } from "phaser";

export class PauseScene extends Scene {
    constructor() {
        super("PauseScene");
    }

    create() {
        this.keyEsc = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.ESC
        );

        const FIRST_RECTANGLE_HEIGHT = 240;
        const SECOND_RECTANGLE_HEIGHT = 70;
        const vertical_shift_to_center = -SECOND_RECTANGLE_HEIGHT / 2;

        // Background rectangles
        this.firstRectangle = this.add
            .rectangle(
                0,
                this.scale.height / 2 + vertical_shift_to_center,
                this.scale.width,
                FIRST_RECTANGLE_HEIGHT,
                0xdcc89f // 🔹 button frame color
            )
            .setAlpha(1)
            .setOrigin(0, 0.5);

        this.secondRectangle = this.add
            .rectangle(
                0,
                this.scale.height / 2 +
                    FIRST_RECTANGLE_HEIGHT / 2 +
                    SECOND_RECTANGLE_HEIGHT / 2 +
                    vertical_shift_to_center,
                this.scale.width,
                SECOND_RECTANGLE_HEIGHT,
                0x5a2a15 // 🔹 brownish shade instead of black
            )
            .setAlpha(0.9)
            .setOrigin(0, 0.5);

        // Control icons + labels
        this.primary_click = this.add.image(
            (this.scale.width * 3) / 4 + 160,
            this.scale.height / 2 + 30 + vertical_shift_to_center,
            "primary_click"
        ).setScale(0.15);

        this.space_bar = this.add.image(
            (this.scale.width * 3) / 4 - 90,
            this.scale.height / 2 + 30 + vertical_shift_to_center,
            "space_bar"
        ).setScale(0.5);

        this.pickup_controls_label = this.add.text(
            (this.scale.width * 3) / 4,
            this.scale.height / 2 - 50 + vertical_shift_to_center,
            "Pickup Ball:",
            {
                fontSize: "48px",
                fontFamily: '"Jersey 10", sans-serif',
                color: "#7f1a02", // 🔹 button brown
            }
        ).setOrigin(0.5);

        this.pickup_controls_or = this.add.text(
            (this.scale.width * 3) / 4 + 90,
            this.scale.height / 2 + 30 + vertical_shift_to_center,
            "or",
            {
                fontSize: "24px",
                fontFamily: '"Jersey 10", sans-serif',
                color: "#7f1a02", // 🔹 button brown
            }
        ).setOrigin(0.5);

        this.WASD = this.add.image(
            this.scale.width / 4 - 100,
            this.scale.height / 2 + 30 + vertical_shift_to_center,
            "WASD"
        ).setScale(0.5);

        this.arrow_keys = this.add.image(
            this.scale.width / 4 + 100,
            this.scale.height / 2 + 30 + vertical_shift_to_center,
            "arrow_keys"
        ).setScale(0.5);

        this.movement_controls_label = this.add.text(
            this.scale.width / 4,
            this.scale.height / 2 - 50 + vertical_shift_to_center,
            "Movement:",
            {
                fontSize: "48px",
                fontFamily: '"Jersey 10", sans-serif',
                color: "#7f1a02", // 🔹 button brown
            }
        ).setOrigin(0.5);

        this.movement_controls_or = this.add.text(
            this.scale.width / 4,
            this.scale.height / 2 + 30 + vertical_shift_to_center,
            "or",
            {
                fontSize: "24px",
                fontFamily: '"Jersey 10", sans-serif',
                color: "#7f1a02", // 🔹 button brown
            }
        ).setOrigin(0.5);

        // --- Buttons (styled like main menu, slightly narrower) ---
        this.resumeButton = this.createStyledButton(
            this.scale.width / 4,
            this.scale.height / 2 +
                FIRST_RECTANGLE_HEIGHT / 2 +
                SECOND_RECTANGLE_HEIGHT / 2 +
                vertical_shift_to_center,
            "Resume",
            () => this.resumeFunction()
        );

        this.returnToMainMenuButton = this.createStyledButton(
            (this.scale.width * 3) / 4,
            this.scale.height / 2 +
                FIRST_RECTANGLE_HEIGHT / 2 +
                SECOND_RECTANGLE_HEIGHT / 2 +
                vertical_shift_to_center,
            "Return to Main Menu",
            () => {
                if (this.game.sfxVolume > 0) {
                    this.sound.play("selection", { volume: this.game.sfxVolume });
                }
                this.game.events.emit("exit-game");
                this.scene.stop("MainScene");
                this.scene.start("MainMenuScene");
                this.scene.stop();
            }
        );

        this.isResuming = false;
    }

    createStyledButton(x, y, label, callback) {
        const border = this.add.rectangle(0, 0, 244, 64, 0xdcc89f).setDepth(3);
        const rect = this.add.rectangle(0, 0, 240, 60, 0x7f1a02).setDepth(3);
        const text = this.add.text(0, 0, label, {
            fontSize: "22px",
            fontFamily: '"Jersey 10", sans-serif',
            color: "#dcc89f",
        }).setOrigin(0.5);

        const container = this.add
            .container(x, y, [border, rect, text])
            .setSize(244, 64)
            .setDepth(3)
            .setInteractive({ useHandCursor: true });

        container.on("pointerover", () => {
            rect.setFillStyle(0xa8321a);
            this.tweens.add({
                targets: container,
                scale: 1.05,
                duration: 150,
                ease: "Power1",
            });
        });

        container.on("pointerout", () => {
            rect.setFillStyle(0x7f1a02);
            this.tweens.add({
                targets: container,
                scale: 1,
                duration: 150,
                ease: "Power1",
            });
        });

        container.on("pointerdown", () => {
            if (this.game.sfxVolume > 0) {
                this.sound.play("selection", { volume: this.game.sfxVolume });
            }
            const tween = this.tweens.add({
                targets: container,
                scale: 0.9,
                duration: 80,
                yoyo: true,
                ease: "Power1",
            });
            tween.once("complete", callback);
        });

        return container;
    }

    resumeFunction() {
        if (this.isResuming) return;
        this.isResuming = true;

        // Destroy UI
        this.resumeButton.destroy();
        this.returnToMainMenuButton.destroy();
        this.firstRectangle.destroy();
        this.secondRectangle.destroy();
        this.WASD.destroy();
        this.arrow_keys.destroy();
        this.primary_click.destroy();
        this.space_bar.destroy();
        this.pickup_controls_label.destroy();
        this.pickup_controls_or.destroy();
        this.movement_controls_label.destroy();
        this.movement_controls_or.destroy();

        // Countdown
        this.countdownText = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2,
            "3",
            {
                fontSize: "100px",
                fontFamily: '"Jersey 10", sans-serif',
                color: "#7f1a02", // 🔹 match theme
                strokeThickness: 10,
                align: "center",
            }
        ).setOrigin(0.5);

        let countdown = 3;
        this.time.addEvent({
            delay: 1000,
            repeat: 2,
            callback: () => {
                countdown--;
                if (countdown > 0) {
                    this.countdownText.setText(countdown.toString());
                } else {
                    this.scene.resume("MainScene");
                    this.scene.stop();
                }
            },
            callbackScope: this,
        });
    }

    update() {
        if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
            this.resumeFunction();
        }
    }
}
