import { Scene } from "phaser";

export class Leaderboard extends Scene {
    constructor() {
        super("Leaderboard");
    }

    init(data) {
        this.gameKey = data.gameKey || "game1";
        this.highlightName = data.highlightName || null;
    }

    async create() {
        // --- Background ---
        this.add.image(0, 0, "home_bg")
            .setOrigin(0, 0)
            .setDisplaySize(this.scale.width, this.scale.height);

        // --- Back button ---
        const BASE_SCALE = 0.05;
        const HOVER_SCALE = BASE_SCALE * 1.15;
        const back = this.add.image(50, 40, "exitIcon")
            .setInteractive()
            .setScale(BASE_SCALE);

        back.on("pointerover", () => {
            this.tweens.add({ targets: back, scale: HOVER_SCALE, duration: 120, ease: "Sine.easeOut" });
            back.setTint(0xffffff);
        });
        back.on("pointerout", () => {
            this.tweens.add({ targets: back, scale: BASE_SCALE, duration: 120, ease: "Sine.easeIn" });
            back.clearTint();
        });
        back.on("pointerdown", () => {
            this.tweens.add({
                targets: back,
                scale: BASE_SCALE * 0.92,
                duration: 70,
                yoyo: true,
                ease: "Sine.easeInOut",
                onComplete: () => this.scene.start("MainMenuScene"),
            });
        });



        // --- Center panel (larger to fit 10 rows + buttons) ---
        const panelWidth = 750;
        const panelHeight = 500;
        const panelX = this.scale.width / 2;
        const panelY = this.scale.height / 2;

        const panel = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0xa8321a)
            .setStrokeStyle(3, 0x570600);

        // --- Title ---
        this.add.text(panelX, panelY - panelHeight / 2 + 40, "Leaderboard", {
            fontSize: "50px",
            fill: "#dcc89f",
            fontFamily: '"Jersey 10", sans-serif',
        }).setOrigin(0.5);

        // --- Mode Buttons (inside panel) ---
        const modes = [
            { label: "Dr. vs. Cr.", key: "game1" },
            { label: "Elements", key: "game2" },
            { label: "Equation 1", key: "game3-1" },
            { label: "Equation 2", key: "game3-2" },
            { label: "Equation 3", key: "game3-3" },
        ];

        const createButton = (x, y, labelText, onClick) => {
            const border = this.add.rectangle(0, 0, 104, 64, 0x7f1a02).setDepth(3);
            border.setStrokeStyle(3, 0xdcc89f);

            const rect = this.add.rectangle(0, 0, 100, 60, 0x7f1a02).setDepth(3);
            const label = this.add.text(0, 0, labelText, {
                fontSize: "22px",
                fontFamily: '"Jersey 10", sans-serif',
                color: "#dcc89f",
                align: "center",
                wordWrap: { width: 90, useAdvancedWrap: true },  // wrap text within button width
            }).setOrigin(0.5).setDepth(3);

            const button = this.add.container(x, y, [border, rect, label]).setDepth(3);
            rect.setInteractive({ useHandCursor: true });

            rect.on("pointerover", () => {
                rect.setFillStyle(0xa8321a);
                this.tweens.add({ targets: button, scale: 1.05, duration: 150, ease: "Power1" });
            });
            rect.on("pointerout", () => {
                rect.setFillStyle(0x7f1a02);
                this.tweens.add({ targets: button, scale: 1, duration: 150, ease: "Power1" });
            });
            rect.on("pointerdown", () => {
                if ((this.game.sfxVolume ?? this.sound.volume) > 0) this.sound.play("selection");
                const tween = this.tweens.add({
                    targets: button,
                    scale: 0.9,
                    duration: 80,
                    yoyo: true,
                    ease: "Power1",
                });
                tween.once("complete", onClick);
            });

            return button;
        };

        const buttonSpacing = 120;
        const buttonRowY = panelY + panelHeight / 2 - 60;
        const buttonStartX = panelX - ((modes.length - 1) * buttonSpacing) / 2;

        modes.forEach((mode, i) => {
            const btn = createButton(
                buttonStartX + i * buttonSpacing,
                buttonRowY,
                mode.label,
                () => this.loadLeaderboard(mode.key, btn)
            );
            btn.setData("modeKey", mode.key);
        });

        // --- Scrollable container ---
        const visibleRows = 10;
        const rowHeight = 28;

        // Define top and bottom of the visible window (below title, above buttons)
        const maskTopY = panelY - panelHeight / 2 + 80;
        const maskBottomY = panelY + panelHeight / 2 - 140;
        const maskVisibleHeight = maskBottomY - maskTopY;

        this.maskTopY = maskTopY;
        this.maskVisibleHeight = maskVisibleHeight;

        // Container that holds leaderboard rows (anchor at top)
        this.tableGroup = this.add.container(panelX, maskTopY);

        // --- Mask to clip both top and bottom ---
        const maskGraphics = this.make.graphics();
        maskGraphics.fillStyle(0xffffff);
        maskGraphics.fillRect(
            panelX - panelWidth / 2 + 40,
            maskTopY,
            panelWidth - 80,
            maskVisibleHeight
        );
        const mask = maskGraphics.createGeometryMask();
        this.tableGroup.setMask(mask);

        // --- Scrollbar ---
        // --- Scrollbar ---
        const trackMargin = 10;
        const scrollBarX = panelX + panelWidth / 2 - 8;
        const scrollBarHeight = maskVisibleHeight - trackMargin * 2;

        // Track background
        this.scrollTrack = this.add.rectangle(
            scrollBarX,
            maskTopY + trackMargin + scrollBarHeight / 2,
            6,
            scrollBarHeight,
            0x3d0c02
        );

        this.scrollTrack.setInteractive({ useHandCursor: true });
        this.scrollTrack.on("pointerdown", (pointer) => {
            const thumbHeight = this.scrollThumb.height;
            const trackTop = this.maskTopY + 10;
            const clickY = pointer.y - thumbHeight / 2;

            this.scrollThumb.y = Phaser.Math.Clamp(clickY, trackTop, trackTop + this.maskVisibleHeight - thumbHeight - 20);

            // Map thumb position to scrollY again
            const overflow = Math.max(0, this.contentHeight - this.maskVisibleHeight);
            const scrollRatio = (this.scrollThumb.y - trackTop) / (this.maskVisibleHeight - thumbHeight - 20);
            this.scrollY = -scrollRatio * overflow;
            this.tableGroup.y = this.maskTopY + this.scrollY;
        });

        // Thumb (top-anchored)
        this.scrollThumb = this.add.rectangle(
            scrollBarX,
            maskTopY + trackMargin,
            6,
            60,
            0xdcc89f
        ).setOrigin(0.5, 0);  // 👈 anchor at top

        this.scrollThumb.setInteractive({ draggable: true, useHandCursor: true });

        // Handle dragging
        this.input.setDraggable(this.scrollThumb);

        this.scrollThumb.on("drag", (pointer, dragX, dragY) => {
            const trackMargin = 10;
            const trackTop = this.maskTopY + trackMargin;
            const trackBottom = this.maskTopY + this.maskVisibleHeight - this.scrollThumb.height - trackMargin;

            // Clamp the thumb to the track
            dragY = Phaser.Math.Clamp(dragY, trackTop, trackBottom);
            this.scrollThumb.y = dragY;

            // Map thumb position back to scrollY
            const overflow = Math.max(0, this.contentHeight - this.maskVisibleHeight);
            const scrollRatio = (dragY - trackTop) / (trackBottom - trackTop);
            this.scrollY = -scrollRatio * overflow;

            // Update the table position
            this.tableGroup.y = this.maskTopY + this.scrollY;
        });

        // Scrolling logic
        this.scrollY = 0;
        this.input.on("wheel", (_, __, ___, deltaY) => {
            this.scrollY -= deltaY * 0.25;
            this.updateScroll(this.maskVisibleHeight, this.maskTopY);
        });


        // --- Load leaderboard ---
        this.loadLeaderboard(this.gameKey);
    }

    updateScroll(maskVisibleHeight, maskTopY) {
        const overflow = Math.max(0, this.contentHeight - maskVisibleHeight);
        const trackMargin = 10;

        if (overflow <= 0) {
            this.scrollY = 0;
            this.scrollThumb.setVisible(false);
            this.tableGroup.y = maskTopY;
            return;
        }

        this.scrollThumb.setVisible(true);

        const minY = -overflow;
        const maxY = 0;
        this.scrollY = Phaser.Math.Clamp(this.scrollY, minY, maxY);
        this.tableGroup.y = maskTopY + this.scrollY;

        // Compute thumb Y using top anchor
        const scrollRatio = -this.scrollY / overflow;
        const trackTop = maskTopY + trackMargin;
        const trackHeight = maskVisibleHeight - this.scrollThumb.height - trackMargin * 2;

        this.scrollThumb.y = trackTop + scrollRatio * trackHeight;
    }

    async loadLeaderboard(mode, button = null) {
        // Clear old
        this.tableGroup.removeAll(true);

        try {
            const res = await fetch(`${this.game.apiBaseUrl}/leaderboard/${mode}`);
            const data = await res.json();
            data.sort((a, b) => b.score - a.score);

            // Column Xs (unchanged)
            const nameX = -30;
            const rankX = nameX - 170;
            const scoreX = nameX + 200;

            // Start just inside the mask (top-anchored container!)
            let y = 8;               // small padding from the top of the mask
            const rowHeight = 28;
            const headerHeight = 26; // matches your font size ~24px with a little breathing room

            // Headers (at the top of the scrollable area)
            const headerStyle = {
                fontSize: "24px",
                fill: "#dcc89f",
                fontFamily: '"Jersey 10", sans-serif',
            };
            const rankHeader = this.add.text(rankX, y, "Rank", headerStyle).setOrigin(0, 0);
            const nameHeader = this.add.text(nameX, y, "Name", headerStyle).setOrigin(0, 0);
            const scoreHeader = this.add.text(scoreX, y, "Score", headerStyle).setOrigin(1, 0);
            this.tableGroup.add(rankHeader);
            this.tableGroup.add(nameHeader);
            this.tableGroup.add(scoreHeader);

            y += headerHeight + 6;  // space under header

            // Rows
            data.forEach((entry, i) => {
                const color = (this.highlightName && entry.username === this.highlightName)
                    ? "#570600" : "#dcc89f";

                this.tableGroup.add(
                    this.add.text(rankX, y, `${i + 1}.`, {
                        fontSize: "22px", fill: color, fontFamily: '"Jersey 10", sans-serif'
                    }).setOrigin(0, 0)
                );
                this.tableGroup.add(
                    this.add.text(nameX, y, entry.username, {
                        fontSize: "22px", fill: color, fontFamily: '"Jersey 10", sans-serif'
                    }).setOrigin(0, 0)
                );
                this.tableGroup.add(
                    this.add.text(scoreX, y, entry.score.toString(), {
                        fontSize: "22px", fill: color, fontFamily: '"Jersey 10", sans-serif'
                    }).setOrigin(1, 0)
                );

                y += rowHeight;
            });

            // Content height is total vertical span we just used
            this.contentHeight = y;

            // Reset scroll and update with correct mask numbers
            this.scrollY = 0;
            this.updateScroll(this.maskVisibleHeight, this.maskTopY);

        } catch (err) {
            console.error(err);
            const msg = this.add.text(0, 20, "Error loading leaderboard", {
                fontSize: "20px",
                fill: "#ff4444",
                fontFamily: '"Jersey 10", sans-serif',
            }).setOrigin(0.5, 0);
            this.tableGroup.add(msg);
            this.contentHeight = 40;
            this.scrollY = 0;
            this.updateScroll(maskVisibleHeight, maskTopY);
        }
    }

}
