// src/scenes/gamemode3/GM3LevelSelect.js
import Phaser from "phaser";

export default class GM3LevelSelect extends Phaser.Scene {
  constructor() {
    super("GM3LevelSelect");
  }

  create(data) {
    const { width, height } = this.scale;

    this.add.text(width / 2, height * 0.18, "GameMode 3 — Select Level", {
      fontSize: "28px",
      color: "#ffffff",
    }).setOrigin(0.5);

    const levels = [
      { key: "GM3Level1", label: "Level 1" },
      { key: "GM3Level2", label: "Level 2" },
      { key: "GM3Level3", label: "Level 3" },
    ];

    levels.forEach((lvl, i) => {
      const y = 0.38 + i * 0.14;
      const btn = this.add.rectangle(width / 2, height * y, width * 0.45, 56, 0x303030)
        .setInteractive({ useHandCursor: true });
      const txt = this.add.text(btn.x, btn.y, lvl.label, { fontSize: "22px", color: "#fff" }).setOrigin(0.5);

      btn.on("pointerover", () => btn.setFillStyle(0x3a3a3a));
      btn.on("pointerout", () => btn.setFillStyle(0x303030));
      btn.on("pointerdown", () => this.scene.start(lvl.key));
    });

    if (data?.lastResult) {
      const { level, score, success } = data.lastResult;
      this.add.text(width / 2, height * 0.85,
        `Last: Level ${level} — ${success ? "Cleared" : "Time Up"} — Score ${score}`,
        { fontSize: "18px", color: "#cccccc" }
      ).setOrigin(0.5);
    }
  }
}
