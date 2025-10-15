import { Scene } from "phaser";
import * as XLSX from "xlsx";

export class EquationScene extends Scene {
  constructor() {
    super("EquationScene");
  }

  init() {
    // ---- Level state ----
    this.currentLevel = null; // 1 | 2 | 3 after selection
    this.currentQuestion = 0;
    this.questionsPerLevel = 10; // 10 questions per level

    // Time limit (seconds)
    this.levelTime = 90;

    // Score
    this.levelPoints = { 1: 100, 2: 200, 3: 300 };
    this.score = 0;

    // Pools built from Excel
    this.levelPools = { 1: [], 2: [], 3: [] };

    // Caches for XML-based bold detection
    this._xmlCache = {
      stylesParsed: false,
      fontBoldByFontId: [],   // index -> boolean
      xfFontIdByXfId: [],     // cellXfs index -> fontId
      sheetXmlByName: new Map(), // sheetName -> XMLDocument
    };

    this.buildPoolsFromExcel();
  }

  create() {
    const { width, height } = this.scale;

    // Background
    this.add.rectangle(0, 0, width, height, 0x7f1a02).setOrigin(0);

    // Score (top-left)
    this.scoreText = this.add.text(20, 20, "Score: 0", {
      fontSize: "28px",
      fontFamily: '"Jersey 10", sans-serif',
      color: "#dcc89f",
    });

    // ESC → Pause
    const escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    escKey.on("down", () => {
      if (!this.scene.isActive("PauseScene")) {
        this.scene.launch("PauseScene", { parent: "EquationScene" });
        this.scene.bringToTop("PauseScene");
        this.scene.pause();
      }
    });

    this.showLevelSelect();
  }

  // --------------------------------------------------------------------------------
  // Excel wiring
  // Level 1: F4..F23 question text. Answers on screen:
  //   [0=TL, 1=TR, 2=BL, 3=BR]  ->  [G, I, H, J]
  // Correctness: ONLY BOLD among G/H/I/J (first try cell.s/r/h; if missing, read raw XML).
  //
  // Level 2/3: placeholders (questions from G4..G23)
  // --------------------------------------------------------------------------------
  buildPoolsFromExcel() {
    try {
      const bin = this.cache.binary.get("excelData");
      if (!bin) {
        console.warn("EquationScene: no excelData in cache");
        return;
      }

      // IMPORTANT: enable bookFiles so we can read raw XML parts
      const wb = XLSX.read(bin, {
        type: "array",
        cellStyles: true,   // harmless; fast-path if present
        cellFormula: true,
        cellNF: true,
        cellDates: true,
        cellText: false,
        sheetStubs: true,
        cellComments: true,
        bookFiles: true,    // <- gives wb.files with xl/worksheets/*.xml and xl/styles.xml
      });

      // Pre-parse styles to map xf -> bold font if available
      this._prepareStyleMaps(wb);

      // --- LEVEL 1 (Easy) ---
      this.levelPools[1] = this.extractLevel1(wb, wb.Sheets["A=L+SE - Easy"], {
        sheetName: "A=L+SE - Easy",
        qCol: "F",
        start: 4,
        end: 23,
        // UI order [TL, TR, BL, BR] = [G, I, H, J]
        addrOrderForRow: (r) => [`G${r}`, `I${r}`, `H${r}`, `J${r}`],
      });

      // --- LEVEL 2 (Medium): G question ---
      this.levelPools[2] = this.extractQuestionOnly(wb.Sheets["A=L+SE - Medium"], {
        qCol: "G",
        start: 4,
        end: 23,
      });

      // --- LEVEL 3 (Hard): G question ---
      this.levelPools[3] = this.extractQuestionOnly(wb.Sheets["A=L+SE - Hard"], {
        qCol: "G",
        start: 4,
        end: 23,
      });
    } catch (e) {
      console.warn("EquationScene: Excel parse failed", e);
    }
  }

  // --------- LEVEL 1 extractor (bold-only with XML fallback) ----------
  extractLevel1(wb, sheet, cfg) {
    if (!sheet) return [];
    const out = [];

    for (let r = cfg.start; r <= cfg.end; r++) {
      const q = this.cellToString(sheet[`${cfg.qCol}${r}`]);
      if (!q) continue;

      const addrs = cfg.addrOrderForRow(r); // [G, I, H, J] in UI order [TL,TR,BL,BR]
      const answers = addrs.map((a) => this.cellToString(sheet[a]) || "");

      // 1) Fast-path bold detection (if SheetJS surfaced styles/rich text/HTML)
      let correctIndex = this.correctIndexFromBold(sheet, addrs);

      // 2) XML fallback if still unknown: parse underlying worksheet XML + styles.xml
      if (correctIndex === -1) {
        correctIndex = this.correctIndexFromXmlBold(wb, cfg.sheetName, addrs);
      }

      // 3) Last resort: keep game playable (top-left)
      if (correctIndex === -1) correctIndex = 0;

      out.push({ question: q, answers, correctIndex });
    }

    return out;
  }

  // ---------- Level 2/3 placeholder extractor ----------
  extractQuestionOnly(sheet, cfg) {
    if (!sheet) return [];
    const out = [];
    for (let r = cfg.start; r <= cfg.end; r++) {
      const q = this.cellToString(sheet[`${cfg.qCol}${r}`]);
      if (!q) continue;

      const answers = ["Option A", "Option B", "Option C", "Option D"];
      const correctIndex = Phaser.Math.Between(0, 3);

      out.push({ question: q, answers, correctIndex });
    }
    return out;
  }

  // ----- Helpers (values) -----
  cellToString(cell) {
    if (!cell) return "";
    if (cell.w != null) return String(cell.w).trim();
    if (cell.v != null) return String(cell.v).trim();
    return "";
  }

  // ----- Fast-path bold (if SheetJS happened to expose it) -----
  isBoldCellFast(cell) {
    try {
      if (cell?.s?.font?.bold === true) return true;
      if (cell?.s?.bold === true) return true;
      if (Array.isArray(cell?.r)) {
        return cell.r.some((run) => run?.s?.b === 1 || run?.s?.bold === true);
      }
      const h = cell?.h;
      if (typeof h === "string" && h.length) {
        const lower = h.toLowerCase();
        if (lower.includes("<b>") || lower.includes("</b>")) return true;
        if (lower.includes("<strong>") || lower.includes("</strong>")) return true;
        if (lower.includes("font-weight:") && lower.includes("bold")) return true;
      }
    } catch {}
    return false;
  }

  correctIndexFromBold(sheet, addrs) {
    for (let i = 0; i < addrs.length; i++) {
      const c = sheet[addrs[i]];
      if (this.isBoldCellFast(c)) return i;
    }
    return -1;
  }

  // ===== XML-LEVEL BOLD DETECTION (robust) =======================================
  // We parse:
  //  - xl/styles.xml  -> fonts + cellXfs (xf -> fontId -> bold?)
  //  - xl/worksheets/sheetN.xml -> for each <c r="A1" ...>, check:
  //       a) inline rich text: <is><r><rPr><b/></rPr>...</r>
  //       b) style ref: c@s => cellXfs[s] => fonts[fontId] has <b/>
  // ===============================================================================

  _prepareStyleMaps(wb) {
    if (this._xmlCache.stylesParsed) return;
    try {
      // styles.xml available only with bookFiles:true
      const stylesXml = wb?.files?.["xl/styles.xml"];
      if (!stylesXml) {
        this._xmlCache.stylesParsed = true; // mark as done (nothing to parse)
        return;
      }
      const doc = new DOMParser().parseFromString(stylesXml, "application/xml");

      // fonts: build array of "isBold" by index
      const fonts = Array.from(doc.getElementsByTagName("fonts")[0]?.getElementsByTagName("font") || []);
      this._xmlCache.fontBoldByFontId = fonts.map(fontNode => {
        // bold present as <b/>
        return fontNode.getElementsByTagName("b").length > 0;
      });

      // cellXfs: map xf index -> fontId
      const cellXfs = Array.from(doc.getElementsByTagName("cellXfs")[0]?.getElementsByTagName("xf") || []);
      this._xmlCache.xfFontIdByXfId = cellXfs.map(xfNode => {
        // fontId is attribute "fontId"
        const fid = xfNode.getAttribute("fontId");
        return fid != null ? parseInt(fid, 10) : null;
      });
    } catch (e) {
      console.warn("EquationScene: styles.xml parse error", e);
    } finally {
      this._xmlCache.stylesParsed = true;
    }
  }

  // Find and cache the XML DOM for a given sheet name
  _getSheetXmlDoc(wb, sheetName) {
    // Cached?
    if (this._xmlCache.sheetXmlByName.has(sheetName)) {
      return this._xmlCache.sheetXmlByName.get(sheetName);
    }

    try {
      // The sheet order in wb.SheetNames corresponds to xl/worksheets/sheet{index+1}.xml
      const idx = (wb.SheetNames || []).indexOf(sheetName);
      if (idx === -1) return null;
      const path = `xl/worksheets/sheet${idx + 1}.xml`;
      const xmlStr = wb?.files?.[path];
      if (!xmlStr) return null;

      const doc = new DOMParser().parseFromString(xmlStr, "application/xml");
      this._xmlCache.sheetXmlByName.set(sheetName, doc);
      return doc;
    } catch (e) {
      console.warn("EquationScene: cannot parse worksheet XML for", sheetName, e);
      return null;
    }
  }

  // Given a sheet name and array of A1 addresses, return first index that is bold
  correctIndexFromXmlBold(wb, sheetName, addrs) {
    const doc = this._getSheetXmlDoc(wb, sheetName);
    if (!doc) return -1;

    for (let i = 0; i < addrs.length; i++) {
      const addr = addrs[i];
      if (this._isCellBoldInXml(doc, addr)) return i;
    }
    return -1;
  }

  // Check bold via inline rich text or style reference
  _isCellBoldInXml(sheetDoc, addr) {
    try {
      // <c r="G4" ...> node
      const cList = sheetDoc.getElementsByTagName("c");
      // Linear scan is fine for ~20 rows; avoids XPath
      for (let k = 0; k < cList.length; k++) {
        const c = cList[k];
        if (c.getAttribute("r") !== addr) continue;

        // (a) Inline rich text: <is><r><rPr><b/>...
        const isNode = c.getElementsByTagName("is")[0];
        if (isNode) {
          const rRuns = isNode.getElementsByTagName("r");
          for (let r = 0; r < rRuns.length; r++) {
            const rPr = rRuns[r].getElementsByTagName("rPr")[0];
            if (rPr && rPr.getElementsByTagName("b").length > 0) return true;
          }
        }

        // (b) Style ref: c has attribute s="xfId"
        const xfIdAttr = c.getAttribute("s");
        if (xfIdAttr != null) {
          const xfId = parseInt(xfIdAttr, 10);
          const fontId = this._xmlCache.xfFontIdByXfId?.[xfId];
          if (fontId != null) {
            const isBold = !!this._xmlCache.fontBoldByFontId?.[fontId];
            if (isBold) return true;
          }
        }

        // If neither path flagged bold, it's not bold
        return false;
      }
    } catch (e) {
      console.warn("EquationScene: XML bold check failed for", addr, e);
    }
    return false;
  }

  // --------------------------------------------------------------------------------
  // Level flow (Level Select → countdown → timer → 10 questions → GameOver)
  // --------------------------------------------------------------------------------

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const partInSeconds = seconds % 60;
    return `${minutes}:${partInSeconds.toString().padStart(2, "0")}`;
  }

  showLevelSelect() {
    const { width, height } = this.scale;

    this.levelTitle = this.add.text(width / 2, height * 0.25, "Choose Level", {
      fontSize: "64px",
      fontFamily: '"Jersey 10", sans-serif',
      color: "#dcc89f",
      stroke: "#7f1a02",
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.levelButtons = [];
    ["Level 1", "Level 2", "Level 3"].forEach((label, idx) => {
      const y = height * 0.45 + idx * 110;
      const btn = this.makeButton(width / 2, y, 360, 80, label, () => {
        this.currentLevel = idx + 1;
        this.cleanupLevelSelect();
        this.startLevelFlow();
      });
      this.levelButtons.push(btn);
    });
  }

  cleanupLevelSelect() {
    if (this.levelTitle) this.levelTitle.destroy();
    if (this.levelButtons) {
      this.levelButtons.forEach((b) => {
        b.box.destroy();
        b.text.destroy();
      });
      this.levelButtons = null;
    }
  }

  makeButton(x, y, w, h, label, onClick) {
    const box = this.add
      .rectangle(x, y, w, h, 0xdcc89f)
      .setStrokeStyle(4, 0x7f1a02)
      .setInteractive({ useHandCursor: true });

    const text = this.add.text(x, y, label, {
      fontSize: "36px",
      fontFamily: '"Jersey 10", sans-serif',
      color: "#7f1a02",
    }).setOrigin(0.5);

    box.on("pointerover", () => box.setFillStyle(0xf5deb3));
    box.on("pointerout", () => box.setFillStyle(0xdcc89f));
    box.on("pointerdown", () => onClick && onClick());

    return { box, text };
  }

  startLevelFlow() {
    this.prepareLevelQuestions();
    this.showLevelIntro();
  }

  prepareLevelQuestions() {
    const pool = (this.levelPools[this.currentLevel] || []).slice();
    Phaser.Utils.Array.Shuffle(pool);
    this.levelQuestions = pool.slice(0, this.questionsPerLevel);

    if (this.levelQuestions.length === 0) {
      this.levelQuestions = Array.from({ length: this.questionsPerLevel }, (_, i) => ({
        question: `Question ${i + 1} of Level ${this.currentLevel}`,
        answers: ["Option A", "Option B", "Option C", "Option D"],
        correctIndex: Phaser.Math.Between(0, 3),
      }));
    }
  }

  showLevelIntro() {
    const { width, height } = this.scale;

    this.currentQuestion = 0;

    this.levelBox = this.add
      .rectangle(width / 2, height / 2, 420, 220, 0xdcc89f)
      .setStrokeStyle(4, 0x7f1a02)
      .setDepth(5);

    this.levelText = this.add
      .text(width / 2, height / 2, `Level ${this.currentLevel}`, {
        fontSize: "48px",
        fontFamily: '"Jersey 10", sans-serif',
        color: "#7f1a02",
      })
      .setOrigin(0.5)
      .setDepth(6);

    this.tweens.add({
      targets: [this.levelBox, this.levelText],
      alpha: 0,
      delay: 1200,
      duration: 900,
      onComplete: () => {
        this.levelBox.destroy();
        this.levelText.destroy();
        this.startCountdown();
      },
    });
  }

  startCountdown() {
    const { width, height } = this.scale;
    let count = 3;

    this.countdownText = this.add.text(width / 2, height / 2, count, {
      fontSize: "96px",
      fontFamily: '"Jersey 10", sans-serif',
      color: "#dcc89f",
      stroke: "#7f1a02",
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.time.addEvent({
      delay: 1000,
      repeat: 2,
      callback: () => {
        count--;
        if (count > 0) {
          this.countdownText.setText(count);
        } else {
          this.countdownText.destroy();
          this.startLevelTimer();
          this.showQuestion();
        }
      },
    });
  }

  startLevelTimer() {
    const { width } = this.scale;
    let timeLeft = this.levelTime;

    if (this.timerEvent) this.timerEvent.remove();
    if (this.timerText) this.timerText.destroy();

    this.timerText = this.add.text(width / 2, 50, this.formatTime(timeLeft), {
      fontSize: "32px",
      fontFamily: '"Jersey 10", sans-serif',
      color: "#dcc89f",
      stroke: "#7f1a02",
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      repeat: timeLeft - 1,
      callback: () => {
        timeLeft--;
        this.timerText.setText(this.formatTime(timeLeft));
        if (timeLeft <= 0) this.endLevel();
      },
    });
  }

  showQuestion() {
    const { width, height } = this.scale;

    const item = this.levelQuestions?.[this.currentQuestion];
    const questionText =
      item?.question ?? `Question ${this.currentQuestion + 1} of Level ${this.currentLevel}`;
    const answers = item?.answers ?? ["Option A", "Option B", "Option C", "Option D"];
    const correctIndex =
      typeof item?.correctIndex === "number" ? item.correctIndex : Phaser.Math.Between(0, 3);

    // Question box
    this.questionBox = this.add
      .rectangle(width / 2, height / 4, width * 0.8, 100, 0xdcc89f)
      .setStrokeStyle(3, 0x7f1a02);

    this.questionText = this.add.text(width / 2, height / 4, questionText, {
      fontSize: "28px",
      fontFamily: '"Jersey 10", sans-serif',
      color: "#7f1a02",
      wordWrap: { width: width * 0.75 },
      align: "center",
    }).setOrigin(0.5);

    // 2x2 grid
    this.answerButtons = [];
    const colX = [width / 4, (3 * width) / 4];      // 0: left, 1: right
    const rowY = [height / 2, height / 2 + 120];    // 0: top, 1: bottom

    answers.forEach((answer, i) => {
      const col = i % 2;               // 0 left, 1 right
      const row = Math.floor(i / 2);   // 0 top, 1 bottom
      const btnX = colX[col];
      const btnY = rowY[row];

      const border = this.add
        .rectangle(btnX, btnY, 350, 70, 0xdcc89f)
        .setStrokeStyle(3, 0x7f1a02)
        .setInteractive({ useHandCursor: true });

      const text = this.add.text(btnX, btnY, String(answer), {
        fontSize: "22px",
        fontFamily: '"Jersey 10", sans-serif',
        color: "#7f1a02",
      }).setOrigin(0.5);

      border.on("pointerover", () => {
        if (!this.answered) border.setFillStyle(0xf5deb3);
      });
      border.on("pointerout", () => {
        if (!this.answered) border.setFillStyle(0xdcc89f);
      });

      border.on("pointerdown", () => {
        if (this.answered) return;
        this.answered = true;

        if (i === correctIndex) {
          border.setFillStyle(0x00aa00);
          this.score += this.levelPoints[this.currentLevel] ?? 100;
          this.scoreText.setText("Score: " + this.score);
        } else {
          border.setFillStyle(0xaa0000);
        }

        // Disable others
        this.answerButtons.forEach((btn, idx) => {
          if (idx !== i) btn.border.disableInteractive();
        });

        this.time.delayedCall(1000, () => this.nextQuestion());
      });

      this.answerButtons.push({ border, text });
    });

    this.answered = false;
  }

  nextQuestion() {
    if (this.questionBox) this.questionBox.destroy();
    if (this.questionText) this.questionText.destroy();
    if (this.answerButtons) {
      this.answerButtons.forEach((btn) => {
        btn.border.destroy();
        btn.text.destroy();
      });
    }

    this.currentQuestion++;

    if (this.currentQuestion < this.questionsPerLevel) {
      this.showQuestion();
    } else {
      this.endLevel();
    }
  }

  endLevel() {
    if (this.questionBox) this.questionBox.destroy();
    if (this.questionText) this.questionText.destroy();
    if (this.answerButtons) {
      this.answerButtons.forEach((btn) => {
        btn.border.destroy();
        btn.text.destroy();
      });
    }

    if (this.timerEvent) this.timerEvent.remove();
    if (this.timerText) this.timerText.destroy();

    this.scene.start("GameOverScene", { score: this.score });
  }
}
