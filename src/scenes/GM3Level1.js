// src/scenes/GM3Level1.js
import * as XLSX from "xlsx";
import BaseGM3Scene from "./BaseGM3Scene";

export default class GM3Level1 extends BaseGM3Scene {
  constructor() {
    super("GM3Level1", { title: "", level: 1, timeLimit: 90 });
    this.currentIndex = 0;
    this.questions = [];
    this.currentCorrect = -1;
    this._uiNodes = [];
  }

  preload() {
    this.load.binary("gm3_easy_xlsx", "assets/UpdatedAccountingElements.xlsx");
    this.load.image("gm3_level1_bg", "assets/level1.jpg");
  }

  onTimeUp() { this._finishToGameOver("timeup"); }

  _finishToGameOver(reason = "completed") {
    if (this.timerEvent) this.timerEvent.remove(false);
    this.scene.start("GameOverScene", { score: this.score, mode: "GM3-Level1", reason });
  }

  buildLevel() {
    const buf = this.cache.binary.get("gm3_easy_xlsx");
    if (!buf) return this._failAndBack("Excel file not found.");

    const wb = XLSX.read(buf, { type: "array", cellStyles: true, cellHTML: true });
    const sheetName = wb.SheetNames.find(n => n.trim().toLowerCase() === "a=l+se - easy".toLowerCase());
    if (!sheetName) return this._failAndBack("Sheet 'A=L+SE - Easy' not found.");
    const sh = wb.Sheets[sheetName];

    const rows = [];
    for (let r = 4; r <= 23; r++) {
      const qCell = sh[`F${r}`], gCell = sh[`G${r}`], hCell = sh[`H${r}`], iCell = sh[`I${r}`], jCell = sh[`J${r}`], kCell = sh[`K${r}`];
      const question = this._getCellText(qCell);
      const A = this._getCellText(gCell), B = this._getCellText(hCell), C = this._getCellText(iCell), D = this._getCellText(jCell);
      if (!question || (!A && !B && !C && !D)) continue;
      let correctIndex = this._fromKCell(kCell);
      if (correctIndex === -1) correctIndex = this._detectGoodGreen([gCell, hCell, iCell, jCell]);
      if (correctIndex === -1) continue;
      rows.push({ question, answers: [A, B, C, D], correctIndex });
    }
    Phaser.Utils.Array.Shuffle(rows);
    this.questions = rows.slice(0, 10);

    const { width, height } = this.scale;

    // Background
    this.add.image(width / 2, height / 2, "gm3_level1_bg")
      .setOrigin(0.5).setDisplaySize(width, height).setDepth(0);

    // SCORE (center top)
    if (this.scoreText)
      this.scoreText.setFontFamily('"Jersey 10", sans-serif')
        .setColor("#dcc89f").setFontSize(42).setStroke("#7f1a02", 3)
        .setDepth(6).setPosition(width / 2, height * 0.04).setOrigin(0.5);

    // Question text (compact)
    const qWrapW = Math.min(560, Math.floor(width * 0.6));
    this.qText = this.add.text(width / 2, height * 0.26, "", {
      fontSize: "30px",
      color: "#7f1a02",
      fontFamily: '"Jersey 10", sans-serif',
      wordWrap: { width: qWrapW, useAdvanced: true },
      align: "center",
    }).setOrigin(0.5).setDepth(6);

    // TIMER (below the question)
    if (this.timerText) {
      this.timerText.setFontFamily('"Jersey 10", sans-serif')
        .setColor("#dcc89f").setFontSize(40).setStroke("#7f1a02", 3)
        .setDepth(6).setPosition(width / 2, height * 0.51).setOrigin(0.50);
      // 🔑 Force numeric text immediately so no "Time: ..." flash
      if (typeof this.timeLeft !== "number") this.timeLeft = 90; // fallback to scene timeLimit
      this.timerText.setText(String(this.timeLeft));
    }

    // Answers (2x2 evenly spaced)
    const cols = 2, totalBoxes = 4;
    const gridWidth = width * 0.8;
    const boxW = gridWidth / cols - 40;
    const boxH = 84;
    const startX = width / 2 - gridWidth / 2 + boxW / 2;
    const startY = height * 0.64;
    const xGap = boxW + 80;
    const yGap = 110;

    const makeAnswer = (idx) => {
      const rect = this.add.rectangle(0, 0, boxW, boxH, 0xdcc89f)
        .setStrokeStyle(3, 0x7f1a02).setInteractive({ useHandCursor: true }).setDepth(5);
      rect.on("pointerover", () => rect.setFillStyle(0xf5deb3));
      rect.on("pointerout", () => rect.setFillStyle(0xdcc89f));
      rect.on("pointerdown", () => this._chooseAnswer(idx));
      const txt = this.add.text(0, 0, "", {
        fontSize: "35px",
        color: "#7f1a02",
        fontFamily: '"Jersey 10", sans-serif',
        wordWrap: { width: boxW - 32 },
        align: "center",
      }).setOrigin(0.5).setDepth(6);
      return { rect, txt };
    };

    this.ansNodes = [makeAnswer(0), makeAnswer(1), makeAnswer(2), makeAnswer(3)];

    for (let i = 0; i < totalBoxes; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * xGap;
      const y = startY + row * yGap;
      this.ansNodes[i].rect.setPosition(x, y);
      this.ansNodes[i].txt.setPosition(x, y);
    }

    // Hide UI until countdown ends
    this._uiNodes = [
      this.qText,
      this.timerText,
      this.scoreText,
      ...this.ansNodes.flatMap(n => [n.rect, n.txt]),
    ];
    this._setGameplayUIVisible(false);

    this.currentIndex = 0;
    this._showCurrent(false);
    this._startCountdown();
  }

  _showCurrent(show = true) {
    if (this.currentIndex >= this.questions.length) return this._finishToGameOver("completed");
    const item = this.questions[this.currentIndex];
    this.currentCorrect = item.correctIndex;
    this.qText.setText(item.question);
    this.ansNodes.forEach((n, i) => {
      n.rect.setFillStyle(0xdcc89f);
      n.txt.setText(item.answers[i] ?? "");
    });
    if (show) this._setGameplayUIVisible(true);
  }

  _chooseAnswer(i) {
    if (!this.input.enabled) return;
    this.input.enabled = false;
    const c = this.currentCorrect;
    if (i === c) {
      this.onScored(100);
      this.ansNodes[i].rect.setFillStyle(0x2e7d32);
    } else {
      this.ansNodes[i].rect.setFillStyle(0x8b0000);
      this.ansNodes[c]?.rect.setFillStyle(0x2e7d32);
    }
    this.time.delayedCall(650, () => {
      this.currentIndex++;
      this._showCurrent(true);
      this.input.enabled = true;
    });
  }

  _startCountdown() {
    this.input.enabled = false;
    if (this.timerEvent) { this.timerEvent.remove(false); this.timerEvent = null; }
    this._uiNodes.forEach(n => n && n.setVisible(false));

    const { width, height } = this.scale;
    const txt = this.add.text(width / 2, height / 2, "3", {
      fontSize: "120px",
      color: "#dcc89f",
      fontFamily: '"Jersey 10", sans-serif',
    }).setOrigin(0.5).setDepth(10);

    const pulse = () => this.tweens.add({ targets: txt, scale: 1.2, duration: 200, yoyo: true });
    const showNum = (n, d) => this.time.delayedCall(d, () => { txt.setText(String(n)); pulse(); });
    showNum(3, 0); showNum(2, 800); showNum(1, 1600);

    this.time.delayedCall(2400, () => {
      txt.destroy();
      this._setGameplayUIVisible(true, true);

      // Tick exactly the number (no label)
      this.timerEvent = this.time.addEvent({
        delay: 1000,
        loop: true,
        callback: () => {
          this.timeLeft--;
          if (this.timerText) this.timerText.setText(String(this.timeLeft));
          if (this.timeLeft <= 0) this.onTimeUp();
        },
      });

      // Make sure the first visible value is numeric too
      if (this.timerText) this.timerText.setText(String(this.timeLeft));

      this.input.enabled = true;
    });
  }

  _setGameplayUIVisible(visible, fade = false) {
    if (!this._uiNodes?.length) return;
    if (!fade) return this._uiNodes.forEach(n => n && n.setVisible(visible));
    if (visible) this._uiNodes.forEach(n => n && (n.setVisible(true), n.setAlpha(0),
      this.tweens.add({ targets: n, alpha: 1, duration: 350 })));
  }

  _failAndBack(msg) {
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2, msg, {
      fontSize: "18px",
      color: "#ffffff",
      align: "center",
      wordWrap: { width: width * 0.9 },
    }).setOrigin(0.5).setDepth(20);
    this.time.delayedCall(2200, () => this.scene.start("GM3LevelSelect"));
  }

  _getCellText(c) { if (!c) return ""; const v = typeof c.w === "string" ? c.w : c.v; return (v ?? "").toString().trim(); }
  _fromKCell(k) { const r = this._getCellText(k).toUpperCase(); if (!r) return -1; return { G:0,H:1,I:2,J:3,"1":0,"2":1,"3":2,"4":3 }[r[0]] ?? -1; }
  _cellIsGood(c) {
    if (!c) return false;
    const rgb = c?.s?.fill?.fgColor?.rgb || c?.s?.fill?.bgColor?.rgb;
    const goods = ["FFC6EFCE","FF92D050","FF00B050","FF00FF00"];
    if (rgb && goods.includes(rgb.toUpperCase())) return true;
    if (typeof c.h === "string" && c.h.toLowerCase().includes("c6efce")) return true;
    return false;
  }
  _detectGoodGreen(cells) { let f=-1; for(let i=0;i<cells.length;i++) if(this._cellIsGood(cells[i])) { if(f!==-1) return -1; f=i; } return f; }
}
