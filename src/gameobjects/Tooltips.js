export class TooltipManager {
    constructor(scene) {
        this.scene = scene;
        this.tooltipContainer = this.scene.add.container(0, 0).setDepth(1000);

        this.tooltipBackground = this.scene.add
            .rectangle(0, 0, 0, 0, 0x000000, 0.8)
            .setOrigin(0, 0);

        this.tooltipText = this.scene.add.text(0, 0, "", {
            fontFamily: "Arial",
            fontSize: "25px",
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

    // Show tooltip on hover
    target.setInteractive();
    target.on("pointerover", () => {
        // Update text & style for THIS target now (not during attach)
        this.tooltipText.setText(text);
        this.tooltipText.setStyle({
            fontSize: `${fontSize}px`,
            wordWrap: { width: maxWidth },
        });

        // Resize background to current text
        const textBounds = this.tooltipText.getBounds();
        this.tooltipBackground.setSize(
            textBounds.width + padding * 2,
            textBounds.height + padding * 2
        );

        // Place text inside background
        this.tooltipText.setPosition(padding, padding);

        // Position tooltip near target
        const globalPos = target.getTopLeft
            ? target.getTopLeft()
            : { x: target.x, y: target.y };

        let x = globalPos.x;
        let y = globalPos.y - this.tooltipBackground.height - 5;

        // Clamp to camera bounds
        const cam = this.scene.cameras.main;
        x = Phaser.Math.Clamp(x, 5, cam.width  - this.tooltipBackground.width  - 5);
        y = Phaser.Math.Clamp(y, 5, cam.height - this.tooltipBackground.height - 5);

        this.tooltipContainer.setPosition(x, y);
        this.tooltipContainer.setVisible(true);
    });

    target.on("pointerout", () => {
        this.tooltipContainer.setVisible(false);
    });
}

}

