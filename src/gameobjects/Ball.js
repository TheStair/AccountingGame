import { GameObjects } from "phaser";

export class Ball extends GameObjects.Container {
    name;
    type;
    state = null;
    direction_belt_label = null;

    constructor(scene, x, y, name, type, difficulty) {
        super(scene, x, y);

        this.name = name;
        this.type = type;
        this.scene = scene;

        this.baseScale = 1;
        this.hoverScale = 0.95; // shrink slightly when hovered

        let defaultBallSize = 90; // 🔹 bigger default ball size

        // --- Goldish colored ball background ---
        this.ballImage = new GameObjects.Image(scene, 0, 0, "ball");
        this.ballImage.setTintFill(0xdcc89f);

        const typeAsText = this.type
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        const textContent =
            difficulty === 0
                ? this.formatTextToSquare(`${this.name}-${typeAsText}`)
                : this.formatTextToSquare(this.name);

        // --- Brown text, larger font ---
        this.textLabel = new GameObjects.Text(scene, 0, 0, textContent, {
            fontSize: "18px", // 🔹 larger
            fill: "#7f1a02",
            stroke: "#7f1a02",
            strokeThickness: 1,
            fontFamily: '"Arial"',
            padding: { x: 6, y: 4 },
            align: "center",
        });
        this.textLabel.setOrigin(0.5, 0.5);

        let textWidth = this.textLabel.width;
        let textHeight = this.textLabel.height;
        let newBallSize = defaultBallSize;

        if (textWidth > defaultBallSize * 0.85) {
            newBallSize = Math.max(newBallSize, textWidth / 0.85);
        }
        if (textHeight > defaultBallSize * 0.85) {
            newBallSize = Math.max(newBallSize, textHeight / 0.85);
        }

        this.ballImage.displayWidth = newBallSize;
        this.ballImage.displayHeight = newBallSize;
        this.textLabel.setWordWrapWidth(newBallSize * 0.9, true);

        this.add([this.ballImage, this.textLabel]);

        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);

        this.hit_box_radius = newBallSize / 2;
        this.body.setCollideWorldBounds(true);

        this.moved_by_belt_this_frame = false;
        this.pit_number = null;
        this.been_in_wrong_basket = false;
    }

    formatTextToSquare(text) {
        const totalLength = text.length;
        const linesCount = Math.ceil(Math.sqrt(totalLength));
        const maxLineLength = Math.ceil(totalLength / linesCount);
        const words = text.split(" ");
        const lines = [];
        let currentLine = "";

        const trySplitWordAtHyphen = (word, available) => {
            let idx = word.lastIndexOf("-", available - 1);
            if (idx !== -1)
                return [
                    word.substring(0, idx + 1),
                    word.substring(idx + 1),
                ];
            idx = word.indexOf("-");
            if (idx !== -1)
                return [
                    word.substring(0, idx + 1),
                    word.substring(idx + 1),
                ];
            return null;
        };

        for (let word of words) {
            const available =
                currentLine.length === 0
                    ? maxLineLength
                    : maxLineLength - currentLine.length - 1;
            if (word.length <= available) {
                currentLine =
                    currentLine.length === 0
                        ? word
                        : currentLine + " " + word;
            } else if (word.indexOf("-") !== -1) {
                if (currentLine.length > 0) {
                    lines.push(currentLine);
                    currentLine = "";
                }
                let remainingWord = word;
                let localAvailable = maxLineLength;
                while (remainingWord.length > localAvailable) {
                    let splitResult = trySplitWordAtHyphen(
                        remainingWord,
                        localAvailable
                    );
                    if (splitResult) {
                        lines.push(splitResult[0]);
                        remainingWord = splitResult[1];
                        localAvailable = maxLineLength;
                    } else {
                        break;
                    }
                }
                currentLine = remainingWord;
            } else {
                if (currentLine.length > 0) lines.push(currentLine);
                currentLine = word;
            }
        }
        if (currentLine.length > 0) lines.push(currentLine);
        return lines.join("\n");
    }

    start(texture = "ball") {
        this.setActive(true);
        this.setVisible(true);
    }

    destroyBall() {
        this.setActive(false);
        this.setVisible(false);
        this.destroy();
        this.state = null;
    }

    goToPit() {
        this.been_in_wrong_basket = true;
        let pit_number = 0;
        while (this.scene.pit_fullnesses[pit_number] === true)
            pit_number += 1;
        if (pit_number > 3) throw Error("Got pit number greater than max of 3.");
        this.pit_number = pit_number;
        this.scene.pit_fullnesses[this.pit_number] = true;
        this.x = this.scene.get_ball_pit_x(this.pit_number);
        this.y = this.scene.ball_pit_y;
    }

    update() {
        this.moved_by_belt_this_frame = false;
    }

    checkHover(tiger) {
        if (this.scene.physics.overlap(this, tiger)) {
            this.applyHoverEffect();
        } else {
            this.clearHoverEffect();
        }
    }

    applyHoverEffect() {
        this.setScale(this.hoverScale);
        this.ballImage.setTintFill(0xdcc89f);
        this.textLabel.setStyle({ fill: "#7f1a02" });
        this.textLabel.setFontSize(16); // 🔹 still readable when hovered
    }

    clearHoverEffect() {
        this.setScale(this.baseScale);
        this.ballImage.setTintFill(0xdcc89f);
        this.textLabel.setStyle({ fill: "#7f1a02" });
        this.textLabel.setFontSize(18); // 🔹 default larger text
    }
}
