// src/scenes/gamemode3/GM3Level1.js
import BaseGM3Scene from "./BaseGM3Scene";

export default class GM3Level1 extends BaseGM3Scene {
  constructor() {
    super("GM3Level1", { title: "GameMode 3", level: 1, timeLimit: 60 });
  }

  buildLevel() {
    const { width, height } = this.scale;

    // Example mechanic: click targets to score
    this.target = this.add.circle(width / 2, height / 2, 26, 0x5d9cec).setInteractive({ useHandCursor: true });
    this.target.on("pointerdown", () => {
      this.onScored(10);
      this.moveTarget();
      if (this.score >= 100) this.endLevel(true);
    });

    // drift the target a bit every second
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.moveTarget(),
    });
  }

  moveTarget() {
    const pad = 40;
    const x = Phaser.Math.Between(pad, this.scale.width - pad);
    const y = Phaser.Math.Between(80, this.scale.height - pad);
    this.tweens.add({ targets: this.target, x, y, duration: 200 });
  }
}
