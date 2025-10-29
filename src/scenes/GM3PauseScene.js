// src/scenes/GM3PauseScene.js
import Phaser from "phaser";

export default class GM3PauseScene extends Phaser.Scene {
  constructor() {
    super("GM3PauseScene");
  }

  init(data) {
    // The GM3 level that launched us (e.g., "GM3Level1/2/3")
    this.returnTo = data?.returnTo;
  }

  create() {
    const { width, height } = this.scale;

    // Dim background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55).setDepth(10);

    // Panel
    const panel = this.add.rectangle(width / 2, height / 2, 360, 220, 0x222222, 1).setDepth(11);
    panel.setStrokeStyle(3, 0xdcc89f);

    this.add.text(width / 2, panel.y - 70, "Paused", {
      fontSize: "28px",
      color: "#dcc89f",
      fontFamily: '"Jersey 10", sans-serif',
    }).setOrigin(0.5).setDepth(11);

    // Buttons
    const makeButton = (y, label, onClick) => {
      const btn = this.add.rectangle(panel.x, y, 240, 52, 0x7f1a02).setDepth(11).setInteractive({ useHandCursor: true });
      btn.setStrokeStyle(2, 0xdcc89f);
      const txt = this.add.text(btn.x, btn.y, label, {
        fontSize: "22px", color: "#dcc89f", fontFamily: '"Jersey 10", sans-serif',
      }).setOrigin(0.5).setDepth(11);

      btn.on("pointerover", () => btn.setFillStyle(0xa8321a));
      btn.on("pointerout",  () => btn.setFillStyle(0x7f1a02));
      btn.on("pointerdown", onClick);
    };

    makeButton(panel.y - 10, "Resume", () => this.resumeParent());
    makeButton(panel.y + 60, "Quit to Main Menu", () => this.quitToMenu());

    // Esc also resumes
    this.input.keyboard.once("keydown-ESC", () => this.resumeParent());
  }

  resumeParent() {
    this.scene.stop();                    // close overlay
    if (this.returnTo) this.scene.resume(this.returnTo);  // resume the GM3 level
  }

  quitToMenu() {
    // Stop overlay and the GM3 level, then go home
    this.scene.stop();
    if (this.returnTo) this.scene.stop(this.returnTo);
    this.scene.start("MainMenuScene");
    this.sound.stopAll();             // kill everything
this.scene.stop(this.parentScene);
this.scene.start("MainMenuScene");
  }
  
}
