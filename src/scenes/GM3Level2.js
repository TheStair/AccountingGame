// src/scenes/GM3Level2.js
import * as XLSX from "xlsx";
import BaseGM3Scene from "./BaseGM3Scene";

export default class GM3Level2 extends BaseGM3Scene {
  constructor() {
    super("GM3Level2", { title: "", level: 2, timeLimit: 90 });
    this.currentIndex = 0;
    this.questions = [];
    this._uiNodes = [];
    this.selectors = [];
    this.selections = { Asset: "BLANK", Liability: "BLANK", SE: "BLANK", NI: "BLANK" };
  }

  preload() {
    this.load.binary("gm3_medium_xlsx", "assets/UpdatedAccountingElements.xlsx");
    this.load.image("gm3_level1_bg", "assets/level1.jpg"); // same background as Level 1
  }

  onTimeUp() { this._finishToGameOver("timeup"); }

  _finishToGameOver(reason = "completed") {
    if (this.timerEvent) this.timerEvent.remove(false);
    this.scene.start("GameOverScene", { score: this.score, mode: "GM3-Level2", reason });
  }

  buildLevel() {
    const buf = this.cache.binary.get("gm3_medium_xlsx");
    if (!buf) return this._failAndBack("Excel file not found.");

    // Parse 'A=L+SE - Medium'!G4:G23 (take up to 10) and C/D/E/F for answers
    try {
      const wb = XLSX.read(buf, { type: "array", cellStyles: true, cellHTML: true });
      const sheetName = wb.SheetNames.find(n => n.trim().toLowerCase() === "a=l+se - medium".toLowerCase());
      if (!sheetName) return this._failAndBack("Sheet 'A=L+SE - Medium' not found.");
      const sh = wb.Sheets[sheetName];

      const normalizeSign = (cell) => {
        const raw = this._getCellText(cell);
        const t = (raw ?? "").toString().trim().toUpperCase();

        // + signs or "plus/positive"
        if (/[+\uFF0B]/.test(t) || t.includes("PLUS") || t.includes("POSITIVE")) return "+";

        // - signs or unicode/minus-like
        if (/[-\u2212\u2012\u2013\u2014\u2015]/.test(t) || t.includes("MINUS") || t.includes("NEGATIVE")) return "-";

        return "BLANK";
      };

      const rows = [];
      for (let r = 4; r <= 23; r++) {
        const qCell = sh[`G${r}`];
        const q = this._getCellText(qCell);
        if (!q) continue;

        // Correct values from columns C (Asset), D (Liability), E (SE), F (NI)
        const asset = normalizeSign(sh[`C${r}`]);
        const liab  = normalizeSign(sh[`D${r}`]);
        const se    = normalizeSign(sh[`E${r}`]);
        const ni    = normalizeSign(sh[`F${r}`]);

        rows.push({ question: q, correct: { Asset: asset, Liability: liab, SE: se, NI: ni } });
      }

      Phaser.Utils.Array.Shuffle(rows);
      this.questions = rows.length ? rows.slice(0, 10) : Array.from({ length: 10 }, (_, i) => ({
        question: `Question ${i + 1}`,
        correct: { Asset: "BLANK", Liability: "+", SE: "-", NI: "BLANK" },
      }));
    } catch (e) {
      console.error("GM3Level2 excel parse error:", e);
      this.questions = Array.from({ length: 10 }, (_, i) => ({
        question: `Question ${i + 1}`,
        correct: { Asset: "BLANK", Liability: "+", SE: "-", NI: "BLANK" },
      }));
    }

    const { width, height } = this.scale;

    // Background
    this.add.image(width / 2, height / 2, "gm3_level1_bg")
      .setOrigin(0.5).setDisplaySize(width, height).setDepth(0);

    // --- HUD (match GM3Level1) ---
    // SCORE (center top)
    if (this.scoreText)
      this.scoreText.setFontFamily('"Jersey 10", sans-serif')
        .setColor("#dcc89f").setFontSize(42).setStroke("#7f1a02", 3)
        .setDepth(6).setPosition(width / 2, height * 0.04).setOrigin(0.5);

    // QUESTION (compact)
    const qWrapW = Math.min(560, Math.floor(width * 0.6));
    this.qText = this.add.text(width / 2, height * 0.26, "", {
      fontSize: "30px",
      color: "#7f1a02",
      fontFamily: '"Jersey 10", sans-serif',
      wordWrap: { width: qWrapW, useAdvanced: true },
      align: "center",
    }).setOrigin(0.5).setDepth(6);

    // TIMER (numeric only)
    if (this.timerText) {
      this.timerText.setFontFamily('"Jersey 10", sans-serif')
        .setColor("#dcc89f").setFontSize(40).setStroke("#7f1a02", 3)
        .setDepth(6).setPosition(width / 2, height * 0.51).setOrigin(0.5);
      if (typeof this.timeLeft !== "number") this.timeLeft = 90;
      this.timerText.setText(String(this.timeLeft));
    }

    // ---- Colors ----
    const brown = 0x7f1a02;
    const beige = 0xdcc89f;

    // ---- Independent Y controls ----
    const leftX = width * 0.08;

    // Independent Y for the equation line
    const EQ_Y = height * 0.57;

    // Independent Y for the selectors (answer boxes + arrows)
    const selY = Math.max((this.timerText?.y ?? height * 0.51) + 120, height * 0.70);

    // Labels: beige text with brown outline
    const labelStyle = {
      fontFamily: '"Jersey 10", sans-serif',
      fontSize: "42px",
      color: "#dcc89f",
      stroke: "#7f1a02",
      strokeThickness: 4,
    };
    const symbolStyle = {
      fontFamily: '"Jersey 10", sans-serif',
      fontSize: "42px",
      color: "#dcc89f",
      stroke: "#7f1a02",
      strokeThickness: 3,
    };

    // "Asset = Liability + Stockholders Equity | Net Income"
    const lblAsset = this.add.text(leftX, EQ_Y, "Asset", labelStyle).setOrigin(0, 0.5).setDepth(6);
    const eq      = this.add.text(lblAsset.x + lblAsset.width + 20, EQ_Y, "=", symbolStyle).setOrigin(0, 0.5).setDepth(6);
    const lblLiab = this.add.text(eq.x + 26, EQ_Y, "Liability", labelStyle).setOrigin(0, 0.5).setDepth(6);
    const plus    = this.add.text(lblLiab.x + lblLiab.width + 14, EQ_Y, "+", symbolStyle).setOrigin(0, 0.5).setDepth(6);
    const lblSE   = this.add.text(plus.x + 20, EQ_Y, "Stockholders Equity", labelStyle).setOrigin(0, 0.5).setDepth(6);
    const pipe    = this.add.text(lblSE.x + lblSE.width + 36, EQ_Y, "|", symbolStyle).setOrigin(0, 0.5).setDepth(6);
    const lblNI   = this.add.text(pipe.x + 22, EQ_Y, "Net Income", labelStyle).setOrigin(0, 0.5).setDepth(6);

    // ---- Selector geometry ----
    const boxW = 120, boxH = 52; // compact fields

    // Horizontal centers under each label
    const assetCenter = lblAsset.x + lblAsset.width / 2;
    const liabCenter  = lblLiab.x + lblLiab.width / 2;
    const seCenter    = lblSE.x + lblSE.width / 2;
    const niCenter    = lblNI.x + lblNI.width / 2;

    // Arrow size and slight vertical offset
    const arrowBase = 42;
    const arrowHeight = 28;
    const ARROW_V_OFFSET = 14;

    const makeArrowPolygon = (base, heightPx, direction) => {
      const half = base / 2;
      return direction === "up"
        ? [-half, 0, half, 0, 0, -heightPx]  // ▲
        : [-half, 0, half, 0, 0,  heightPx]; // ▼
    };

    const cycleValues = ["BLANK", "+", "-"];

    // Build a selector (container keeps arrows and box aligned)
    const makeSelector = (centerX, key) => {
      const container = this.add.container(centerX, selY).setDepth(6);

      // Box
      const rect = this.add.rectangle(0, 0, boxW, boxH, beige, 1)
        .setStrokeStyle(3, brown)
        .setInteractive({ useHandCursor: true });
      container.add(rect);

      // Value text
      const valueText = this.add.text(0, 0, this.selections[key], {
        fontFamily: '"Jersey 10", sans-serif',
        fontSize: "30px",
        color: "#7f1a02",
        align: "center",
      }).setOrigin(0.5).setDepth(7);
      container.add(valueText);

      // ▲ Up
      const upPoly = this.add
        .polygon(20, -boxH / 2 - 5 + ARROW_V_OFFSET, makeArrowPolygon(arrowBase, arrowHeight, "up"), beige)
        .setStrokeStyle(3, brown)
        .setDepth(7)
        .setInteractive(
          new Phaser.Geom.Polygon(makeArrowPolygon(arrowBase, arrowHeight, "up")),
          Phaser.Geom.Polygon.Contains
        );
      container.add(upPoly);

      // ▼ Down
      const downPoly = this.add
        .polygon(20, boxH / 2 + 5 + ARROW_V_OFFSET, makeArrowPolygon(arrowBase, arrowHeight, "down"), beige)
        .setStrokeStyle(3, brown)
        .setDepth(7)
        .setInteractive(
          new Phaser.Geom.Polygon(makeArrowPolygon(arrowBase, arrowHeight, "down")),
          Phaser.Geom.Polygon.Contains
        );
      container.add(downPoly);

      // Hover highlights
      upPoly.on("pointerover", () => upPoly.setFillStyle(0xefdcbc, 1));
      upPoly.on("pointerout",  () => upPoly.setFillStyle(beige, 1));
      downPoly.on("pointerover", () => downPoly.setFillStyle(0xefdcbc, 1));
      downPoly.on("pointerout",  () => downPoly.setFillStyle(beige, 1));

      // Cycling
      const cycleForward = () => {
        const cur = this.selections[key];
        const idx = cycleValues.indexOf(cur);
        const next = cycleValues[(idx + 1) % cycleValues.length];
        this.selections[key] = next;
        valueText.setText(next);
        this.sound?.play?.("ui_click");
      };
      const cycleBackward = () => {
        const cur = this.selections[key];
        const idx = cycleValues.indexOf(cur);
        const next = cycleValues[(idx - 1 + cycleValues.length) % cycleValues.length];
        this.selections[key] = next;
        valueText.setText(next);
        this.sound?.play?.("ui_click");
      };

      rect.on("pointerover", () => rect.setFillStyle(0xefdcbc));
      rect.on("pointerout",  () => rect.setFillStyle(beige));
      rect.on("pointerdown", cycleForward);
      upPoly.on("pointerdown", cycleForward);
      downPoly.on("pointerdown", cycleBackward);

      return { container, rect, valueText, upPoly, downPoly, key };
    };

    // Build selectors
    this.selectors = [
      makeSelector(assetCenter, "Asset"),
      makeSelector(liabCenter,  "Liability"),
      makeSelector(seCenter,    "SE"),
      makeSelector(niCenter,    "NI"),
    ];

    // Submit button
    const nextY = selY + 100;
    const nextBtn = this.add.rectangle(width / 2, nextY, 180, 50, beige)
      .setStrokeStyle(4, brown)
      .setOrigin(0.5)
      .setDepth(9)
      .setInteractive({ useHandCursor: true });

    const nextTxt = this.add.text(width / 2, nextY, "Submit", {
      fontFamily: '"Jersey 10", sans-serif',
      fontSize: "36px",
      color: "#7f1a02",
    }).setOrigin(0.5).setDepth(10);

    nextBtn
      .on("pointerover", () => nextBtn.setFillStyle(0xefdcbc))
      .on("pointerout",  () => nextBtn.setFillStyle(beige))
      .on("pointerdown", () => this._onSubmit());

    // Hide gameplay UI until countdown ends
    this._uiNodes = [
      this.qText,
      this.timerText,
      this.scoreText,
      lblAsset, eq, lblLiab, plus, lblSE, pipe, lblNI,
      ...this.selectors.map(s => s.container),
      nextBtn, nextTxt,
    ];
    this._setGameplayUIVisible(false);

    // Kickoff
    this.currentIndex = 0;
    this._showCurrent(false);

    // 🔔 Show pre-start beige card FIRST (then do countdown & start timer)
    this._showPreStartCard();
  }

  _showCurrent(show = true) {
    if (this.currentIndex >= this.questions.length) return this._finishToGameOver("completed");

    const item = this.questions[this.currentIndex];
    const q = typeof item === "string" ? item : (item?.question ?? "");
    this.qText.setText(q);

    // Reset all selectors to BLANK each question
    this.selections = { Asset: "BLANK", Liability: "BLANK", SE: "BLANK", NI: "BLANK" };
    this.selectors.forEach(s => s.valueText.setText(this.selections[s.key]));

    if (show) this._setGameplayUIVisible(true);
  }

  _onSubmit() {
    const item = this.questions[this.currentIndex];
    if (!item) return;

    const sel = this.selections;
    const cor = item.correct ?? { Asset: "", Liability: "", SE: "", NI: "" };

    const allMatch =
      sel.Asset === cor.Asset &&
      sel.Liability === cor.Liability &&
      sel.SE === cor.SE &&
      sel.NI === cor.NI;

    // Try to find the submit button by geometry (same as we created)
    const nextBtn = this._uiNodes.find(n => n && n.type === "Rectangle" && n.width === 180 && n.height === 50);

    if (allMatch) {
      this.onScored(200);
      this._flashScreen(0x2e7d32, 0.35); // green flash
      if (nextBtn) nextBtn.setFillStyle(0x2e7d32);
    } else {
      this._flashScreen(0x8b0000, 0.35); // red flash
      if (nextBtn) nextBtn.setFillStyle(0x8b0000);
    }

    // Tween the button color back to beige after flash
    if (nextBtn) {
      this.time.delayedCall(350, () => nextBtn.setFillStyle(0xdcc89f));
    }

    // Advance after delay
    this.input.enabled = false;
    this.time.delayedCall(650, () => {
      this.currentIndex++;
      this._showCurrent(true);
      this.input.enabled = true;
    });
  }

  // --- New: Pre-start beige card shown BEFORE countdown/timer ---
  _showPreStartCard() {
    // Disable input and hide gameplay UI while the card shows
    this.input.enabled = false;
    if (this.timerEvent) { this.timerEvent.remove(false); this.timerEvent = null; }
    this._uiNodes?.forEach(n => n && n.setVisible(false));

    const { width, height } = this.scale;

    // Container for animation + cleanup
    const card = this.add.container(width / 2, height / 2).setDepth(20).setScale(0.9).setAlpha(0);

    // Beige panel with brown border
    const panelW = Math.min(800, Math.floor(width * 0.88));
    const panelH = 220;

    const g = this.add.graphics();
    const BEIGE = 0xF5DEB3; // beige fill (close to theme)
    const BROWN = 0x7f1a02; // theme brown

    g.lineStyle(6, BROWN, 1);
    g.fillStyle(BEIGE, 1);

    const radius = 18;
    g.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, radius);
    g.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, radius);

    const message = "What is the effect on the financial statement elements?  Click on up and down arrows or element boxes to indicate change";
    const title = this.add.text(0, 0, message, {
      fontSize: "34px",
      color: "#7f1a02",
      fontFamily: '"Jersey 10", sans-serif',
      align: "center",
      wordWrap: { width: panelW - 48, useAdvanced: true },
    }).setOrigin(0.5);

    card.add([g, title]);

    // Fade/scale in
    this.tweens.add({
      targets: card,
      alpha: 1,
      scale: 1,
      duration: 260,
      ease: "Quad.easeOut",
    });

    // Hold, then fade out and start countdown
    this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: card,
        alpha: 0,
        duration: 220,
        onComplete: () => {
          card.destroy();
          this._startCountdown();
        },
      });
    });
  }

  _flashScreen(colorHex, maxAlpha = 0.35) {
    const { width, height } = this.scale;
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, colorHex, 0).setDepth(50);
    this.tweens.add({
      targets: overlay,
      alpha: maxAlpha,
      duration: 120,
      yoyo: true,
      ease: "Quad.easeOut",
      onComplete: () => overlay.destroy(),
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

      // Numeric countdown only
      this.timerEvent = this.time.addEvent({
        delay: 1000,
        loop: true,
        callback: () => {
          this.timeLeft--;
          if (this.timerText) this.timerText.setText(this.timeLeft + "s");
          if (this.timeLeft <= 0) this.onTimeUp();
        },
      });

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

  _getCellText(c) { if (!c) return ""; const v = typeof c?.w === "string" ? c.w : c?.v; return (v ?? "").toString().trim(); }
}
