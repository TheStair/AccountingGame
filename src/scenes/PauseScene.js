import { Scene } from "phaser";

export class PauseScene extends Scene {
    constructor() {
        super("PauseScene");
    }

    init(data) {
        // Store which scene launched the pause menu
        this.parentScene = data.parent || "MainScene";
    }

    create() {
        const { width, height } = this.scale;

        // Make sure PauseScene is on top
        this.scene.bringToTop("PauseScene");

        // Root container for everything
        this.ui = this.add.container(0, 0).setDepth(10000);

        const FIRST_RECTANGLE_HEIGHT = 340;
        const SECOND_RECTANGLE_HEIGHT = 70;
        const vertical_shift_to_center = -SECOND_RECTANGLE_HEIGHT / 2;

        // --- Background bands ---
        const firstRectangle = this.add
            .rectangle(
                0,
                height / 2 + vertical_shift_to_center,
                width,
                FIRST_RECTANGLE_HEIGHT,
                0xdcc89f
            )
            .setOrigin(0, 0.5);

        const secondRectangle = this.add
            .rectangle(
                0,
                height / 2 +
                    FIRST_RECTANGLE_HEIGHT / 2 +
                    SECOND_RECTANGLE_HEIGHT / 2 +
                    vertical_shift_to_center,
                width,
                SECOND_RECTANGLE_HEIGHT,
                0x5a2a15
            )
            .setOrigin(0, 0.5)
            .setAlpha(0.9);

        this.ui.add([firstRectangle, secondRectangle]);

        // --- Control icons & labels (scaled down to fit neatly) ---

        // Pickup label
        const pickup_controls_label = this.add
            .text(
                (width * 3) / 4,
                height / 2 - 50 + vertical_shift_to_center,
                "Pickup Ball:",
                {
                    fontSize: "48px",
                    fontFamily: '"Jersey 10", sans-serif',
                    color: "#7f1a02",
                }
            )
            .setOrigin(0.5);

        // Space bar (smaller)
        const space_bar = this.add
            .image(
                (width * 3) / 4 - 80,
                height / 2 + 30 + vertical_shift_to_center,
                "space_bar"
            )
            .setScale(0.2); // was 0.5

        const pickup_controls_or = this.add
            .text(
                (width * 3) / 4 + 60, // was +90
                height / 2 + 30 + vertical_shift_to_center,
                "or",
                {
                    fontSize: "24px",
                    fontFamily: '"Jersey 10", sans-serif',
                    color: "#7f1a02",
                }
            )
            .setOrigin(0.5);

        // Primary click (slightly smaller)
        const primary_click = this.add
            .image(
                (width * 3) / 4 + 140,
                height / 2 + 30 + vertical_shift_to_center,
                "primary_click"
            )
            .setScale(0.15); // was 0.15

        // Movement label
        const movement_controls_label = this.add
            .text(
                width / 4,
                height / 2 - 50 + vertical_shift_to_center,
                "Movement:",
                {
                    fontSize: "48px",
                    fontFamily: '"Jersey 10", sans-serif',
                    color: "#7f1a02",
                }
            )
            .setOrigin(0.5);

        // WASD (smaller)
        const WASD = this.add
            .image(
                width / 4 - 90,
                height / 2 + 30 + vertical_shift_to_center,
                "WASD"
            )
            .setScale(0.2); // was 0.5

        const movement_controls_or = this.add
            .text(width / 4, height / 2 + 30 + vertical_shift_to_center, "or", {
                fontSize: "24px",
                fontFamily: '"Jersey 10", sans-serif',
                color: "#7f1a02",
            })
            .setOrigin(0.5);

        // Arrow keys (smaller)
        const arrow_keys = this.add
            .image(
                width / 4 + 90,
                height / 2 + 30 + vertical_shift_to_center,
                "arrow_keys"
            )
            .setScale(0.2); // was 0.5

        this.ui.add([
            primary_click,
            space_bar,
            pickup_controls_label,
            pickup_controls_or,
            WASD,
            arrow_keys,
            movement_controls_label,
            movement_controls_or,
        ]);

        // --- Buttons ---
        this.resumeButton = this.createStyledButton(
            width / 4,
            height / 2 +
                FIRST_RECTANGLE_HEIGHT / 2 +
                SECOND_RECTANGLE_HEIGHT / 2 +
                vertical_shift_to_center,
            "Resume",
            () => this.resumeFunction()
        );

        this.returnToMainMenuButton = this.createStyledButton(
  (width * 3) / 4,
  height / 2 + FIRST_RECTANGLE_HEIGHT / 2 + SECOND_RECTANGLE_HEIGHT / 2 + vertical_shift_to_center,
  "Return to Main Menu",
  () => {
    if (this.game.sfxVolume > 0) {
      this.sound.play("selection", { volume: this.game.sfxVolume });
    }

    // 🔇 Kill ANY music/SFX currently playing
    this.game.musicManager?.stop();   // stop tracked background music
    this.sound.stopAll();             // safety net: stop all active sounds

    this.game.events.emit("exit-game");
    this.scene.stop(this.parentScene);   // stop the gameplay scene
    this.scene.start("MainMenuScene");   // go to main menu
    this.scene.stop();                   // close PauseScene
  }
);

        this.ui.add([this.resumeButton, this.returnToMainMenuButton]);

        // --- ESC handling (instant resume) ---
        this.keyEsc = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.ESC
        );
        this.keyEsc.on("down", () => this.resumeFunction());
    }

    createStyledButton(x, y, label, callback) {
        const border = this.add.rectangle(0, 0, 244, 64, 0xdcc89f);
        const rect = this.add.rectangle(0, 0, 240, 60, 0x7f1a02);
        const text = this.add
            .text(0, 0, label, {
                fontSize: "22px",
                fontFamily: '"Jersey 10", sans-serif',
                color: "#dcc89f",
            })
            .setOrigin(0.5);

        const container = this.add
            .container(x, y, [border, rect, text])
            .setSize(244, 64)
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
        // Instantly resume the paused parent scene
        this.scene.resume(this.parentScene);
        this.scene.stop(); // close PauseScene
    }
}

