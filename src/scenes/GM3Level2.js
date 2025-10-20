// src/scenes/gamemode3/GM3Level2.js
import BaseGM3Scene from "./BaseGM3Scene";

export default class GM3Level2 extends BaseGM3Scene {
  constructor() {
    super("GM3Level2", { title: "GameMode 3", level: 2, timeLimit: 75 });
  }

  buildLevel() {
    const { width, height } = this.scale;

    // Example: two targets, lower points each, higher threshold
    this.targets = [1, 2].map(() =>
      this.add.circle(Phaser.Math.Between(60, width - 60), Phaser.Math.Between(100, height - 60), 22, 0x9ccc65)
        .setInteractive({ useHandCursor: true })
    );

    this.targets.forEach(t => {
      t.on("pointerdown", () => {
        this.onScored(6);
        this.reposition(t);
        if (this.score >= 120) this.endLevel(true);
      });
    });

    this.time.addEvent({ delay: 900, loop: true, callback: () => this.targets.forEach(t => this.reposition(t)) });
  }

  reposition(t) {
    const pad = 50;
    t.setPosition(Phaser.Math.Between(pad, this.scale.width - pad), Phaser.Math.Between(120, this.scale.height - pad));
  }
}
