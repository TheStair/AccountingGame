// src/scenes/gamemode3/BaseGM3Scene.js
import Phaser from "phaser";

export default class BaseGM3Scene extends Phaser.Scene {
  /**
   * @param {string} key  scene key
   * @param {{title:string, level:number, timeLimit?:number}} cfg
   */
  constructor(key, cfg) {
    super(key);
    this.modeTitle = cfg.title ?? "GameMode 3";
    this.level = cfg.level ?? 1;
    this.timeLimit = cfg.timeLimit ?? 90;

    // state
    this.score = 0;
    this.timeLeft = this.timeLimit;
  }

  preload() {
    // preload assets shared by all GM3 levels (if any)
  }

  create() {
    const { width, height } = this.scale;

    // background
    this.add.rectangle(width / 2, height / 2, width, height, 0x101010).setDepth(-1);

    // header
    this.add
      .text(width / 2, 24, `${this.modeTitle} — Level ${this.level}`, { fontSize: "24px", color: "#ffffff" })
      .setOrigin(0.5, 0);

    // HUD
    this.scoreText = this.add.text(16, 20, "Score: 0", { fontSize: "18px", color: "#ffffff" });
    this.timerText = this.add.text(width - 16, 20, `Time: ${this.timeLeft}`, { fontSize: "18px", color: "#ffffff" }).setOrigin(1, 0);

    this.input.keyboard.on("keydown-ESC", () => {
  // Avoid stacking multiple overlays
  if (this.scene.isActive("GM3PauseScene")) return;
  this.scene.launch("GM3PauseScene", { returnTo: this.scene.key });
  this.scene.pause();
});

    // timer
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.timeLeft -= 1;
        this.timerText.setText(`Time: ${this.timeLeft}`);
        if (this.timeLeft <= 0) this.onTimeUp();
      },
    });

    // Let the child class build its own gameplay
    this.buildLevel();
  }

  // ---- Hooks for child classes ----
  buildLevel() {
    // override in child: layout, input, goals
  }

  onScored(points = 10) {
    this.score += points;
    this.scoreText.setText(`Score: ${this.score}`);
  }

  onTimeUp() {
    this.endLevel(false);
  }

  endLevel(success = true) {
    if (this.timerEvent) this.timerEvent.remove(false);
    // Go back to level select and show last result
    this.scene.start("GM3LevelSelect", { lastResult: { level: this.level, score: this.score, success } });
  }
}
