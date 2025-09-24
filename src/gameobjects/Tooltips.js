export class TooltipManager {
    constructor(scene) {
        this.scene = scene;
        this.tooltipContainer = this.scene.add.container(0, 0).setDepth(1000);

        this.tooltipBackground = this.scene.add
            .rectangle(0, 0, 0, 0, 0x000000, 0.8)
            .setOrigin(0, 0);

        this.tooltipText = this.scene.add.text(0, 0, "", {
            fontFamily: "Arial",
            fontSize: "16px",
            color: "#ffffff",
            wordWrap: { width: 200 },
        });

        this.tooltipContainer.add([this.tooltipBackground, this.tooltipText]);
        this.tooltipContainer.setVisible(false);
    }

    attachTo(target, text, options = {}) {
        const maxWidth = options.maxWidth || 200;
        const fontSize = options.fontSize || 16;
        const padding = options.padding || 5;

        // Update text style
        this.tooltipText.setText(text);
        this.tooltipText.setStyle({
            fontSize: `${fontSize}px`,
            wordWrap: { width: maxWidth },
        });

        // Update background size
        const textBounds = this.tooltipText.getBounds();
        this.tooltipBackground.setSize(
            textBounds.width + padding * 2,
            textBounds.height + padding * 2
        );

        // Reposition text inside background
        this.tooltipText.setPosition(padding, padding);

        // Show tooltip on hover
        target.setInteractive();
        target.on("pointerover", () => {
            const globalPos = target.getTopLeft
                ? target.getTopLeft()
                : { x: target.x, y: target.y };

            // Calculate tooltip position
            let x = globalPos.x;
            let y = globalPos.y - this.tooltipBackground.height - 5;

            // Clamp to screen bounds
            const cam = this.scene.cameras.main;
            const screenWidth = cam.width;
            const screenHeight = cam.height;

            x = Phaser.Math.Clamp(
                x,
                5,
                screenWidth - this.tooltipBackground.width - 5
            );
            y = Phaser.Math.Clamp(
                y,
                5,
                screenHeight - this.tooltipBackground.height - 5
            );

            this.tooltipContainer.setPosition(x, y);
            this.tooltipContainer.setVisible(true);
        });

        target.on("pointerout", () => {
            this.tooltipContainer.setVisible(false);
        });
    }
}

