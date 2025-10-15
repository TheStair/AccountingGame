import { Scene } from "phaser";


export class Leaderboard extends Scene {
    constructor() {
        super('Leaderboard');
    }

    init(data) {
        this.gameKey = data?.gameKey || "game1";
        this.highlightName = data?.highlightName || null;
    }

    async create() {
        const bg = this.add.image(0, 0, 'home_bg')
            .setOrigin(0, 0)
            .setDisplaySize(this.scale.width, this.scale.height);

        const back = this.add.image(50, 50, 'exitIcon')
            .setInteractive()
            .setScale(0.1)
            .on('pointerdown', () => this.scene.start('MainMenuScene'));

        this.add.rectangle(
            this.scale.width / 2,
            this.scale.height / 2,
            this.scale.width,
            this.scale.height,
            0x000000,
            0.4
        );

        // --- Center panel ---
        const panelWidth = 500;
        const panelHeight = 400;
        const panelX = this.scale.width / 2;
        const panelY = this.scale.height / 2;
        const panel = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x1b1b1b, 0.95)
            .setStrokeStyle(3, 0xffffff);

        // --- Title ---
        this.add.text(panelX, panelY - panelHeight / 2 + 40, 'Leaderboard', {
            fontSize: '34px',
            fill: '#ffffff',
            fontStyle: 'bold',
        }).setOrigin(0.5);


        // --- Game mode buttons ---
        const modes = [
            { label: 'Game 1', key: 'game1' },
            { label: 'Game 2', key: 'game2' },
            { label: 'Math 1', key: 'game3_beginner' },
            { label: 'Math 2', key: 'game3_intermediate' },
            { label: 'Math 3', key: 'game3_advanced' },
        ];

        this.activeButton = null;
        const buttonSpacing = 100;
        const buttonStartX = this.scale.width / 2 - ((modes.length - 1) * buttonSpacing) / 2;
        const buttonY = panelY + panelHeight / 2 - 30;

        modes.forEach((mode, i) => {
            const btn = this.add.text(buttonStartX + i * buttonSpacing, buttonY, mode.label, {
                fontSize: '20px',
                fill: '#00ff88',
                backgroundColor: '#333333',
                padding: { x: 10, y: 4 },
            })
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => this.loadLeaderboard(mode.key, btn))
                .on('pointerover', () => btn.setStyle({ backgroundColor: '#007755' }))
                .on('pointerout', () => {
                    if (btn !== this.activeButton) btn.setStyle({ backgroundColor: '#333333' });
                });
        });

        // --- Scrollable container setup ---
        const maskHeight = 220;
        const maskY = panelY - 20;
        this.tableGroup = this.add.container(panelX, maskY);

        // --- Mask to clip overflowing text ---
        const maskGraphics = this.make.graphics();
        maskGraphics.fillStyle(0xffffff);
        maskGraphics.fillRect(panelX - panelWidth / 2 + 20, maskY - maskHeight / 2, panelWidth - 40, maskHeight);
        const mask = maskGraphics.createGeometryMask();
        this.tableGroup.setMask(mask);

        // --- Scroll controls ---
        this.scrollY = 0;
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            this.scrollY += deltaY * 0.5; // adjust scroll speed here
            this.updateScroll();
        });

        // --- Load default leaderboard ---
        this.loadLeaderboard('game1');
    }

    updateScroll() {
        // clamp scroll
        const minY = -Math.max(0, this.contentHeight - 200);
        const maxY = 0;
        this.scrollY = Phaser.Math.Clamp(this.scrollY, minY, maxY);
        this.tableGroup.y = this.scale.height / 2 - 20 + this.scrollY;
    }

    async loadLeaderboard(mode, button = null) {
        // Reset buttons
        if (this.activeButton) this.activeButton.setStyle({ backgroundColor: '#333333' });
        if (button) {
            button.setStyle({ backgroundColor: '#007755' });
            this.activeButton = button;
        }

        // Clear previous entries
        this.tableGroup.removeAll(true);

        try {
            const res = await fetch(`http://127.0.0.1:8000/leaderboard/${mode}`);
            const data = await res.json();

            data.sort((a, b) => b.score - a.score);

            // --- Column positions relative to container center ---
            const rankX = -180;
            const nameX = -40;
            const scoreX = 160;
            let startY = -100;

            // --- Header row ---
            const headerStyle = { fontSize: '20px', fill: '#00ff88', fontStyle: 'bold' };
            const rankHeader = this.add.text(rankX, startY - 30, '#', headerStyle).setOrigin(0, 0);
            const nameHeader = this.add.text(nameX, startY - 30, 'Name', headerStyle).setOrigin(0, 0);
            const scoreHeader = this.add.text(scoreX, startY - 30, 'Score', headerStyle).setOrigin(1, 0);
            this.tableGroup.add(rankHeader);
            this.tableGroup.add(nameHeader);
            this.tableGroup.add(scoreHeader);

            // --- Data rows ---
            data.forEach((entry, i) => {
                const y = startY + i * 28;
                
                const color =
                    this.highlightName && entry.username === this.highlightName
                        ? "#00ff88"
                        : "#ffffff";

                const rankText = this.add.text(rankX, y, `${i + 1}.`, { fontSize: '18px', fill: color }).setOrigin(0, 0);
                const nameText = this.add.text(nameX, y, entry.username, { fontSize: '18px', fill: color }).setOrigin(0, 0);
                const scoreText = this.add.text(scoreX, y, entry.score.toString(), { fontSize: '18px', fill: color }).setOrigin(1, 0);

                this.tableGroup.add(rankText);
                this.tableGroup.add(nameText);
                this.tableGroup.add(scoreText);
            });

            this.contentHeight = data.length * 28;
            this.scrollY = 0;
            this.updateScroll();
        } catch (err) {
            console.error(err);
            const msg = this.add.text(0, 0, 'Error loading leaderboard', {
                fontSize: '20px',
                fill: '#ff4444',
            }).setOrigin(0.5);
            this.tableGroup.add(msg);
        }
    }
}