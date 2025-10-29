import { Scene } from "phaser";
import { TooltipManager } from "../gameobjects/Tooltips";

export class MenuScene extends Scene {
  constructor() {
    super("MenuScene");
  }

  init() {
    this.cameras.main.fadeIn(1000, 0, 0, 0);
    this.tooltip = new TooltipManager(this);
  }

  create() {
    const FIRST_RECTANGLE_HEIGHT = 240;
    const SECOND_RECTANGLE_HEIGHT = 70;
    const vertical_shift_to_center = -SECOND_RECTANGLE_HEIGHT / 2;

    // Background rectangles (theme colors)
    this.add
      .rectangle(
        0,
        this.scale.height / 2 + vertical_shift_to_center,
        this.scale.width,
        FIRST_RECTANGLE_HEIGHT,
        0xdcc89f // gold tan like button frame
      )
      .setAlpha(1)
      .setOrigin(0, 0.5);

    this.add
      .rectangle(
        0,
        this.scale.height / 2 +
          FIRST_RECTANGLE_HEIGHT / 2 +
          SECOND_RECTANGLE_HEIGHT / 2 +
          vertical_shift_to_center,
        this.scale.width,
        SECOND_RECTANGLE_HEIGHT,
        0x5a2a15 // dark brown bottom
      )
      .setAlpha(0.9)
      .setOrigin(0, 0.5);

    // ----- Control icons + labels -----

    // Right side: Pickup controls
    this.pickup_controls_label = this.add
      .text(
        (this.scale.width * 3) / 4,
        this.scale.height / 2 - 50 + vertical_shift_to_center,
        "Pickup Ball:",
        {
          fontSize: "48px",
          fontFamily: '"Jersey 10", sans-serif',
          color: "#7f1a02", // brown
        }
      )
      .setOrigin(0.5);

    // Space bar (scaled to fit)
    this.space_bar = this.add.image(
      (this.scale.width * 3) / 4 - 80,
      this.scale.height / 2 + 30 + vertical_shift_to_center,
      "space_bar"
    );
    this._fitToBox(this.space_bar, 520, 110); // max W x H

    this.pickup_controls_or = this.add
      .text(
        (this.scale.width * 3) / 4 + 60,
        this.scale.height / 2 + 30 + vertical_shift_to_center,
        "or",
        {
          fontSize: "24px",
          fontFamily: '"Jersey 10", sans-serif',
          color: "#7f1a02",
        }
      )
      .setOrigin(0.5);

    // Primary click (scaled to fit)
    this.primary_click = this.add.image(
      (this.scale.width * 3) / 4 + 140,
      this.scale.height / 2 + 30 + vertical_shift_to_center,
      "primary_click"
    );
    this._fitToBox(this.primary_click, 520, 110);

    // Left side: Movement controls
    this.movement_controls_label = this.add
      .text(
        this.scale.width / 4,
        this.scale.height / 2 - 50 + vertical_shift_to_center,
        "Movement:",
        {
          fontSize: "48px",
          fontFamily: '"Jersey 10", sans-serif',
          color: "#7f1a02",
        }
      )
      .setOrigin(0.5);

    // WASD (scaled to fit)
    this.WASD = this.add.image(
      this.scale.width / 4 - 90,
      this.scale.height / 2 + 30 + vertical_shift_to_center,
      "WASD"
    );
    this._fitToBox(this.WASD, 520, 110);

    this.movement_controls_or = this.add
      .text(
        this.scale.width / 4,
        this.scale.height / 2 + 30 + vertical_shift_to_center,
        "or",
        {
          fontSize: "24px",
          fontFamily: '"Jersey 10", sans-serif',
          color: "#7f1a02",
        }
      )
      .setOrigin(0.5);

    // Arrow keys (scaled to fit)
    this.arrow_keys = this.add.image(
      this.scale.width / 4 + 90,
      this.scale.height / 2 + 30 + vertical_shift_to_center,
      "arrow_keys"
    );
    this._fitToBox(this.arrow_keys, 520, 110);

    // --- Buttons (styled like main menu) ---
    this.createStyledButton(
      this.scale.width / 4,
      this.scale.height / 2 +
        FIRST_RECTANGLE_HEIGHT / 2 +
        SECOND_RECTANGLE_HEIGHT / 2 +
        vertical_shift_to_center,
      "Start Game",
      () => {
        localStorage.setItem("difficulty", "1");
        if (this.game.sfxVolume > 0) {
          this.sound.play("selection", {
            volume: this.game.sfxVolume,
          });
        }
        this.game.events.emit("start-game");
      },
      `Default mode, put vocab in correct bins. If a vocab is sorted correctly the first time, it is worth full points; otherwise, half points.`
    );

    this.createStyledButton(
      (this.scale.width * 3) / 4,
      this.scale.height / 2 +
        FIRST_RECTANGLE_HEIGHT / 2 +
        SECOND_RECTANGLE_HEIGHT / 2 +
        vertical_shift_to_center,
      "Start Tutorial",
      () => {
        localStorage.setItem("difficulty", "0");
        if (this.game.sfxVolume > 0) {
          this.sound.play("selection", {
            volume: this.game.sfxVolume,
          });
        }
        this.game.events.emit("start-game");
      },
      "Play with answers revealed as a good study tool."
    );
  }

  createStyledButton(x, y, label, callback, tooltipText) {
    const border = this.add.rectangle(0, 0, 244, 64, 0xdcc89f).setDepth(3);
    const rect = this.add.rectangle(0, 0, 240, 60, 0x7f1a02).setDepth(3);
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

    if (tooltipText) {
      this.tooltip.attachTo(container, tooltipText);
    }

    return container;
  }

  // Helper: scale any image to fit max width/height while preserving aspect ratio
  _fitToBox(gameObject, maxW, maxH, padding = 0) {
    const w = gameObject.width;
    const h = gameObject.height;
    if (!w || !h) return;
    const availW = Math.max(1, maxW - padding * 2);
    const availH = Math.max(1, maxH - padding * 2);
    const scale = Math.min(availW / w, availH / h);
    gameObject.setScale(scale);
  }
}
