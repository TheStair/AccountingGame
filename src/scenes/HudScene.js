import { Scene } from "phaser";

// The HUD scene is the scene that shows the points and the remaining time.
export class HudScene extends Scene {
    remaining_time = 0;

    remaining_time_text;
    points_text;

    constructor() {
        super("HudScene");
    }

    init(data) {
        this.cameras.main.fadeIn(1000, 0, 0, 0);
        this.remaining_time = data.remaining_time;
    }

    create() {
        // --- Points text (left) ---
        this.points_text = this.add.text(10, 10, "POINTS:000", {
            fontSize: "32px",
            fontFamily: '"Jersey 10", sans-serif',
            color: "#7f1a02", // goldish frame color
        }).setOrigin(0, 0);

        // --- Time text (right-aligned) ---
        this.remaining_time_text = this.add.text(
            this.scale.width - 10,
            10,
            `TIME:${this.remaining_time.toString().padStart(2, "0")}s`,
            {
                fontSize: "32px",
                fontFamily: '"Jersey 10", sans-serif',
                color: "#7f1a02", // goldish frame color
            }
        ).setOrigin(1, 0);
    }

    update_points(points) {
        this.points_text.setText(`POINTS:${points.toString().padStart(3, "0")}`);
    }

    update_timeout(timeout) {
        this.remaining_time_text.setText(
            `TIME:${timeout.toString().padStart(2, "0")}s`
        );
    }
}
