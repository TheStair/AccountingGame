// src/scenes/GM3LevelSelect.js
import Phaser from "phaser";

export default class GM3LevelSelect extends Phaser.Scene {
  constructor() {
    super("GM3LevelSelect");
  }

  create(data) {
    const { width, height } = this.scale;

    // --- Keep existing menu music alive ---
    const mm = this.game?.musicManager;
    if (mm) {
      // Apply the current saved volume to global manager FIRST
      const vol = this.game.sfxVolume ?? mm.default_config?.volume ?? 1;
      this.sound.volume = vol;

      // If music from MainMenu is already playing, do nothing (no restart)
      // Otherwise (e.g., entering here directly), start it.
      if (!mm.isPlaying()) {
        // Replace 'menu_bgm' with whatever key you used in MainMenuScene
        mm.play(this, "menu_bgm"); 
      }

      // Stay in sync with future slider changes
      const onVol = (v) => { mm.setVolume(v); this.sound.volume = v; };
      this.game.events.on("volume-changed", onVol);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off("volume-changed", onVol));
      this.events.once(Phaser.Scenes.Events.DESTROY,  () => this.game.events.off("volume-changed", onVol));
    }

    // --- Background (same as main menu) ---
    this.add.image(width / 2, height / 2, "home_bg")
      .setOrigin(0.5)
      .setDisplaySize(width, height)
      .setDepth(0);

    // Moving clouds
    this.clouds = this.add.image(width / 2, height / 2 - 50, "home_clouds")
      .setOrigin(0.5)
      .setScale(0.5)
      .setDepth(1);
    this.cloudSpeed = 0.3;

    // --- Backwards Arrow Button (top-left) ---
    const backContainer = this.add.container(90, 46).setDepth(5);
    const w = 60, h = 40;

    const backBorder = this.add.rectangle(0, 0, w + 4, h + 4, 0x7f1a02);
    backBorder.setStrokeStyle(2, 0xdcc89f);

    const backRect = this.add.rectangle(0, 0, w, h, 0x7f1a02);
    backRect.setStrokeStyle(2, 0xdcc89f);

    const backArrow = this.add.text(0, 0, "←", {
      fontSize: "32px",
      fontFamily: '"Jersey 10", sans-serif',
      color: "#dcc89f",
      align: "center",
      stroke: "#dcc89f",
      strokeThickness: 2,
    }).setOrigin(0.5);

    backContainer.add([backBorder, backRect, backArrow]);
    Phaser.Display.Align.In.Center(backArrow, backRect);
    backArrow.y -= 3;

    backRect.setInteractive({ useHandCursor: true });
    backRect.on("pointerover", () => {
      backRect.setFillStyle(0xa8321a);
      this.tweens.killTweensOf(backContainer);
      this.tweens.add({ targets: backContainer, scale: 1.1, duration: 150, ease: "Sine.easeOut" });
    });
    backRect.on("pointerout", () => {
      backRect.setFillStyle(0x7f1a02);
      this.tweens.killTweensOf(backContainer);
      this.tweens.add({ targets: backContainer, scale: 1, duration: 150, ease: "Sine.easeIn" });
    });
    backRect.on("pointerdown", () => {
      // SFX uses current global volume
      if ((this.game?.sfxVolume ?? this.sound.volume) > 0) {
        this.sound.play("selection"); // let global manager handle volume
      }
      this.scene.start("MainMenuScene"); // don't touch music; MusicManager prevents same-track restart
    });

    // --- Level Buttons aligned like main menu ---
    const levels = [
      { key: "GM3Level1", label: "Level 1" },
      { key: "GM3Level2", label: "Level 2" },
      { key: "GM3Level3", label: "Level 3" },
    ];
    const totalButtons = levels.length;
    const spacing = 100;
    const blockHeight = (totalButtons - 1) * spacing;
    const startY = height / 2 - blockHeight / 2;

    levels.forEach((lvl, i) => {
    this._makeUIButton(width / 2, startY + i * spacing, lvl.label, () => {
    // SFX
    if ((this.game?.sfxVolume ?? this.sound.volume) > 0) this.sound.play("selection");

    // 🔇 Kill current (menu) music before entering a level
    this.game.musicManager?.stop();

    // Go to the selected level
    this.scene.start(lvl.key);
  });
    });

    // ESC returns to main menu (again: don't touch music)
    this._escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC, false);
    this._escKey.on("down", () => this.scene.start("MainMenuScene"));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this._escKey?.destroy());
  }

  update() {
    if (this.clouds) {
      this.clouds.x -= this.cloudSpeed;
      if (this.clouds.x + this.clouds.displayWidth / 2 < 0)
        this.clouds.x = this.scale.width + this.clouds.displayWidth / 2;
      if (this.clouds.x - this.clouds.displayWidth / 2 > this.scale.width)
        this.clouds.x = -this.clouds.displayWidth / 2;
    }
  }

  _makeUIButton(x, y, label, onClick, opts = {}) {
    const w = opts.w ?? 300;
    const h = opts.h ?? 60;

    const border = this.add.rectangle(0, 0, w + 4, h + 4, 0x7f1a02).setDepth(3);
    border.setStrokeStyle(3, 0xdcc89f);

    const rect = this.add.rectangle(0, 0, w, h, 0x7f1a02).setDepth(3);
    rect.setStrokeStyle(2, 0xdcc89f);

    const text = this.add.text(0, 0, label, {
      fontSize: opts.fontSize ?? "24px",
      fontFamily: '"Jersey 10", sans-serif',
      color: "#dcc89f",
    }).setOrigin(0.5).setDepth(4);

    const btn = this.add.container(x, y, [border, rect, text]).setDepth(3);

    rect.setInteractive({ useHandCursor: true });
    rect.on("pointerover", () => {
      rect.setFillStyle(0xa8321a);
      this.tweens.add({ targets: btn, scale: 1.05, duration: 140, ease: "Power1" });
    });
    rect.on("pointerout", () => {
      rect.setFillStyle(0x7f1a02);
      this.tweens.add({ targets: btn, scale: 1.0, duration: 140, ease: "Power1" });
    });
    rect.on("pointerdown", () => {
      const t = this.tweens.add({ targets: btn, scale: 0.92, duration: 90, yoyo: true, ease: "Power1" });
      t.once("complete", onClick);
    });

    return btn;
  }
}
