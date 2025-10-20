// src/scenes/gamemode3/GM3Level3.js
import BaseGM3Scene from "./BaseGM3Scene";

export default class GM3Level3 extends BaseGM3Scene {
  constructor() {
    super("GM3Level3", { title: "GameMode 3", level: 3, timeLimit: 90 });
  }

  buildLevel() {
    const { width, height } = this.scale;

    // Example: moving target that damages score if missed (harder)
    this.target = this.add.rectangle(width / 2, height / 2, 40, 40, 0xff7043)
      .setInteractive({ useHandCursor: true });

    this.target.on("pointerdown", () => {
      this.onScored(8);
      this.jump();
      if (this.score >= 150) this.endLevel(true);
    });

    // penalize random misses—encourage precision
    this.input.on("pointerdown", (p, objs) => {
      if (!objs.length) {
        this.onScored(-5);
      }
    });

    this.time.addEvent({ delay: 700, loop: true, callback: () => this.jump() });
  }

  jump() {
    const pad = 60;
    const x = Phaser.Math.Between(pad, this.scale.width - pad);
    const y = Phaser.Math.Between(130, this.scale.height - pad);
    this.tweens.add({ targets: this.target, x, y, duration: 180, ease: "Sine.easeInOut" });
  }
}
