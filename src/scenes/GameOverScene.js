// src/scenes/GameOverScene.js
import { Scene } from "phaser";

export class GameOverScene extends Scene {
  end_points = 0;

  constructor() {
    super("GameOverScene");
  }

  init(data) {
    // Accept both shapes from callers:
    // - GM3Level1/2/3 send: { score, mode: "GM3-Level1"/"GM3-Level2"/"GM3-Level3" }
    // - Others might send: { points, gameKey }
    this.end_points = (data && (data.points ?? data.score)) || 0;
    this.gameKey = (data && (data.gameKey ?? data.mode)) || "MainScene";
  }

  // Normalize whatever we received into an actual scene key to restart
  _resolveRestartScene() {
    const key = String(this.gameKey || "");
    if (key === "GM3Level1" || key === "GM3-Level1") return "GM3Level1";
    if (key === "GM3Level2" || key === "GM3-Level2") return "GM3Level2";
    if (key === "GM3Level3" || key === "GM3-Level3") return "GM3Level3";
    return "MainScene";
  }

  async create() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    // --- Tasteful palette (harmonizes with GM3) ---
    const COLORS = {
      BG_DIM: 0x0b0907,            // very dark brown-black overlay
      PANEL_BEIGE: 0xeadbb7,       // softer beige
      PANEL_BEIGE_HOVER: 0xf0e5c9, // gentle hover (kept for input styling)
      STROKE_BROWN: 0x7f1a02,      // accent brown-red
      TEXT_LIGHT: "#efe6d3",       // warm light text
      TEXT_DARK: "#6b2a12",        // softer brown
      OK: 0x2e7d32,
      ERR: 0x8b0000,
      ACCENT: 0xb98a5e,            // inner accent line
      BTN_BROWN: 0x7f1a02,         // button fill
      BTN_BROWN_HOVER: 0x9a2a10,   // hover fill
      BTN_STROKE: 0x4e1a0c,        // darker edge
      BTN_TEXT: "#ffffff",         // white text
    };

    // --- Choose background based on restart scene ---
    const restartScene = this._resolveRestartScene();
    const preferGM3 = restartScene.startsWith("GM3Level");
    const desiredBgKey = preferGM3 ? "gm3_shared_bg" : "gameover_bg";

    let bgKey = desiredBgKey;
    if (!this.textures.exists(bgKey)) {
      if (this.textures.exists(preferGM3 ? "gameover_bg" : "gm3_shared_bg")) {
        bgKey = preferGM3 ? "gameover_bg" : "gm3_shared_bg";
      } else if (this.textures.exists("background")) {
        bgKey = "background";
      }
    }

    // Background + subtle dim
    this.add.image(0, 0, bgKey).setOrigin(0, 0).setDepth(0)
      .setDisplaySize(width, height);
    this.add.rectangle(centerX, centerY, width, height, COLORS.BG_DIM, 0.46).setDepth(1);

    // --- Minimal sparkle at the top ---
    this._ensureParticleTextures();
    this.add.particles(0, 0, "spark8", {
      x: { min: 0, max: width },
      y: { min: 0, max: 12 },
      lifespan: 1100,
      speedY: { min: 60, max: 120 },
      scale: { start: 0.9, end: 0 },
      alpha: { start: 0.6, end: 0 },
      tint: [0xffffff, 0xf6eddc, 0xdcc89f],
      quantity: 1,
      frequency: 120,
      blendMode: "ADD"
    }).setDepth(1.2);

    // --- Smaller, cleaner parchment panel ---
    const panelW = Math.min(660, Math.floor(width * 0.78));
    const panelH = Math.min(420, Math.floor(height * 0.64));

    // Soft drop shadow
    const shadow = this.add.graphics().setDepth(2);
    shadow.fillStyle(0x000000, 0.20);
    shadow.fillRoundedRect(centerX - panelW / 2 + 8, centerY - panelH / 2 + 10, panelW, panelH, 22);

    // Panel base
    const panel = this.add.graphics().setDepth(2.2);
    panel.lineStyle(5, COLORS.STROKE_BROWN, 1);
    panel.fillStyle(COLORS.PANEL_BEIGE, 1);
    panel.strokeRoundedRect(centerX - panelW / 2, centerY - panelH / 2, panelW, panelH, 22);
    panel.fillRoundedRect(centerX - panelW / 2, centerY - panelH / 2, panelW, panelH, 22);

    // Thin inner accent line
    const inner = this.add.graphics().setDepth(2.3);
    inner.lineStyle(2, COLORS.ACCENT, 0.65);
    inner.strokeRoundedRect(centerX - panelW / 2 + 8, centerY - panelH / 2 + 8, panelW - 16, panelH - 16, 18);

    // Title
    this.add.text(centerX, centerY - panelH / 2 + 40, "GAME OVER", {
      fontSize: "56px",
      color: COLORS.TEXT_LIGHT,
      fontFamily: '"Jersey 10", sans-serif',
      align: "center",
    }).setOrigin(0.5).setDepth(3).setStroke("#7f1a02", 4);

    // Divider
    const deco = this.add.graphics().setDepth(3);
    deco.lineStyle(3, COLORS.STROKE_BROWN, 0.7);
    deco.beginPath();
    deco.moveTo(centerX - panelW * 0.34, centerY - panelH / 2 + 76);
    deco.lineTo(centerX + panelW * 0.34, centerY - panelH / 2 + 76);
    deco.strokePath();

    // --- SCORE (raised even higher) ---
    this.add.text(centerX, centerY - 52, "YOUR SCORE", {
      fontSize: "28px",
      color: COLORS.TEXT_DARK,
      fontFamily: '"Jersey 10", sans-serif',
      align: "center",
    }).setOrigin(0.5).setDepth(3);

    const scoreText = this.add.text(centerX, centerY - 18, "0", {
      fontSize: "54px",
      color: COLORS.TEXT_LIGHT,
      fontFamily: '"Jersey 10", sans-serif',
      align: "center",
    }).setOrigin(0.5).setDepth(3).setStroke("#7f1a02", 4);

    // Subtle count up
    this.tweens.addCounter({
      from: 0,
      to: Math.max(0, parseInt(this.end_points, 10) || 0),
      duration: 700,
      ease: "Quad.Out",
      onUpdate: (tw) => scoreText.setText(String(Math.floor(tw.getValue()))),
    });

    // --- Leaderboard preview / qualification (raised even higher) ---
    let qualifies = null;
    let previewRank = null;

    try {
      const previewRes = await fetch(
        `${this.game.apiBaseUrl}/preview?game=${encodeURIComponent(
          this.gameKey
        )}&score=${parseInt(this.end_points)}`
      );
      const result = await previewRes.json();
      qualifies = !!result.qualifies;
      previewRank = result.preview_rank ?? null;
    } catch (err) {
      console.error("Error checking leaderboard preview:", err);
      this._line(centerX, centerY + 36, "Error connecting to leaderboard.", COLORS.ERR);
    }

    if (qualifies === true) {
      this.showQualificationUI(centerX, centerY + 52, previewRank);
    } else if (qualifies === false) {
      this._line(centerX, centerY + 52, "You did not make the leaderboard.", COLORS.ERR);
    }

    // --- Buttons Row (BROWN, rounded, white text) ---
    this.createMenuButtons(centerX, centerY + panelH / 2 - 54);
  }

  _line(cx, cy, msg, tintHex) {
    this.add.text(cx, cy, msg, {
      fontSize: "28px",
      color: "#efe6d3",
      fontFamily: '"Jersey 10", sans-serif',
      align: "center",
    }).setOrigin(0.5).setDepth(3).setStroke("#7f1a02", 3).setTint(tintHex);
  }

  _ensureParticleTextures() {
    if (!this.textures.exists("spark8")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1);
      g.fillCircle(4, 4, 4);
      g.generateTexture("spark8", 8, 8);
      g.destroy();
    }
    if (!this.textures.exists("confetti")) {
      const g2 = this.make.graphics({ x: 0, y: 0, add: false });
      g2.fillStyle(0xffffff, 1);
      g2.fillRect(0, 0, 8, 18);
      g2.generateTexture("confetti", 8, 18);
      g2.destroy();
    }
  }

  // Very small confetti pop used only on successful submit
  _burstConfetti(x, y, qty = 8) {
    const p = this.add.particles(x, y, "confetti", {
      lifespan: 750,
      speed: { min: 80, max: 180 },
      angle: { min: 220, max: 320 },
      rotate: { start: 0, end: 180 },
      scale: { start: 0.9, end: 0.2 },
      gravityY: 280,
      quantity: qty,
      tint: [0xf6eddc, 0xffffff, 0xeadbb7],
      blendMode: "NORMAL"
    }).setDepth(4);
    this.time.delayedCall(760, () => p.destroy());
  }

  // Brown rounded button with white text, accurate hover via an explicit Zone hit-area
  _makeBrownButton(x, y, label, onClick) {
    const COLORS = {
      FILL: 0x7f1a02,
      HOVER: 0x9a2a10,
      STROKE: 0x4e1a0c,
      TEXT: "#ffffff",
    };

    // Text
    const txt = this.add.text(x, y, label, {
      fontSize: "32px",
      color: COLORS.TEXT,
      fontFamily: '"Jersey 10", sans-serif',
      align: "center",
    }).setOrigin(0.5).setDepth(7);

    // Dimensions
    const padX = 26;
    const padY = 14;
    const w = Math.max(220, txt.width + padX * 2);
    const h = Math.max(62, txt.height + padY * 2);
    const r = 18;

    // Graphics rounded rect
    const g = this.add.graphics().setDepth(6);
    const draw = (fill) => {
      g.clear();
      g.lineStyle(5, COLORS.STROKE, 1);
      g.fillStyle(fill, 1);
      g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
    };
    draw(COLORS.FILL);

    // Explicit hit zone (exact size), guarantees correct hover even if text overlaps
    const zone = this.add.zone(x, y, w, h).setOrigin(0.5).setDepth(8).setInteractive({
      cursor: "pointer",
      useHandCursor: true,
      hitArea: new Phaser.Geom.Rectangle(0, 0, w, h),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    });

    zone.on("pointerover", () => draw(COLORS.HOVER));
    zone.on("pointerout",  () => draw(COLORS.FILL));
    zone.on("pointerdown", () => { g.y += 1; txt.y += 1; });
    zone.on("pointerup",   () => { g.y -= 1; txt.y -= 1; if (typeof onClick === "function") onClick(); });

    // Keep things grouped for z-order sanity
    const container = this.add.container(0, 0, [g, txt, zone]).setSize(w, h).setDepth(7);

    return container;
  }

  showQualificationUI(centerX, centerY, rank) {
    const msg = `🎉 You made the leaderboard! Rank #${rank}`;
    this.add.text(centerX, centerY, msg, {
      fontSize: "30px",
      color: "#efe6d3",
      fontFamily: '"Jersey 10", sans-serif',
      align: "center",
      wordWrap: { width: Math.min(620, this.scale.width * 0.82), useAdvanced: true },
    }).setOrigin(0.5).setDepth(6).setStroke("#7f1a02", 3).setTint(0x2e7d32);

    this.add.text(centerX, centerY + 30, "Enter your initials:", {
      fontSize: "28px",
      color: "#6b2a12",
      fontFamily: '"Jersey 10", sans-serif',
    }).setOrigin(0.5).setDepth(6);

    // DOM input styled on-theme (raised with rest)
    const input = this.add.dom(centerX, centerY + 64, "input", {
      type: "text",
      maxlength: 3,
      fontSize: "26px",
      textAlign: "center",
      width: "108px",
    });
    input.setDepth(7);
    input.node.style.textTransform = "uppercase";
    input.node.style.background = "#eadbb7";
    input.node.style.border = "3px solid #7f1a02";
    input.node.style.borderRadius = "10px";
    input.node.style.color = "#6b2a12";
    input.node.style.fontFamily = '"Jersey 10", sans-serif';
    input.node.style.padding = "8px 10px";
    input.node.style.boxShadow = "0 2px 0 #7f1a02";

    const handleSubmit = async () => {
      const username = (input.node.value || "").toUpperCase().slice(0, 3) || "AAA";
      const score = parseInt(this.end_points, 10);

      try {
        const res = await fetch(`${this.game.apiBaseUrl}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ game: this.gameKey, username, score }),
        });

        if (!res.ok) throw new Error(`Submit failed (${res.status})`);
        await res.json();

        this._burstConfetti(centerX, centerY + 96, 10);

        this.add.text(centerX, centerY + 96, "Score submitted!", {
          fontSize: "26px",
          color: "#efe6d3",
          fontFamily: '"Jersey 10", sans-serif',
        }).setOrigin(0.5).setDepth(7).setStroke("#7f1a02", 3).setTint(0x2e7d32);

        this.time.delayedCall(900, () => {
          this.scene.start("Leaderboard", {
            gameKey: this.gameKey,
            highlightName: username,
          });
        });
      } catch (err) {
        console.error("Error submitting score:", err);
        this.add.text(centerX, centerY + 96, "Submission failed.", {
          fontSize: "26px",
          color: "#efe6d3",
          fontFamily: '"Jersey 10", sans-serif',
        }).setOrigin(0.5).setDepth(7).setStroke("#7f1a02", 3).setTint(0x8b0000);
      }
    };

    // Brown rounded button with accurate hover
    this._makeBrownButton(centerX, centerY + 116, "Submit", handleSubmit);
    this.input.keyboard.once("keydown-ENTER", handleSubmit);
  }

  createMenuButtons(centerX, baseY) {
    const gap = 240;

    this._makeBrownButton(centerX - gap / 2, baseY, "Play Again", () => {
      const restartScene = this._resolveRestartScene();
      this.scene.start(restartScene);
    });

    this._makeBrownButton(centerX + gap / 2, baseY, "Main Menu", () => {
      this.scene.start("MainMenuScene");
    });
  }
}
