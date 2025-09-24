import { NONE, Scene } from "phaser";
import { Player } from "../gameobjects/Player";
import { ConveyorBelt } from "../gameobjects/ConveyorBelt";
import { Ball } from "../gameobjects/Ball";
import { Basket } from "../gameobjects/Basket";
import { TooltipManager } from "../gameobjects/Tooltips";
import * as XLSX from "xlsx";

export const base_url = import.meta.env.VITE_API_URL;

const DEBIT = "Debit";
const CREDIT = "Credit";
const ASSETS = "Assets";
const LIABITILITIES = "Liabilities";
const STAKEHOLDERS_EQUITY = "Stakeholders Equity";
const EXPENSES = "Expenses";
const REVENUES = "Revenues";
const DESCRIPTION_MAP = new Map([
    [DEBIT, "Debit"],
    [CREDIT, "Credit"],
    [ASSETS, "A present right of an entity to an economic benefit."],
    [
        LIABITILITIES,
        "A present obligation that requires an entity to transferor otherwise provide economic benefits to others.",
    ],
    [
        STAKEHOLDERS_EQUITY,
        "The residual interest in the assets of anentity that remains after deducting its liabilities.",
    ],
    [
        EXPENSES,
        "Expenses are outflows or other using up of assets of anentity or incurrences of its liabilities (or a combination of both) from delivering orproducing goods, rendering services, or carrying out other activities",
    ],
    [
        REVENUES,
        "Inflows or other enhancements of assets of an entityor settlements of its liabilities (or a combination of both) from delivering orproducing goods, rendering services, or carrying out other activities",
    ],
]);

const NUM_BALLS_AT_TIME = 4;
export const RIGHT_FIRST_TIME_SCORE = 10;
export const RIGHT_NOT_FIRST_TIME_SCORE = 5;

const config = {
    time_limit: 90000,
    time_between_ball_spawns: 3000,
    time_move_across_screen: 500,
};

export class MainScene extends Scene {
    player = null;
    enemy_blue = null;

    points;
    game_over_timeout;

    config = config;

    constructor() {
        super("MainScene");
    }

    init(data) {
        this.ballCount = 0;
        this.cameras.main.fadeIn(1000, 0, 0, 0);

        if (!this.normalBalance || !this.allSheet) {
            const binary = this.cache.binary.get("excelData");
            const workbook = XLSX.read(binary, { type: "array" });
            this.normalBalance = XLSX.utils.sheet_to_json(
                workbook.Sheets["Normal Balance Easy"] ?? {},
                { header: 1 }
            );
            this.allSheet = XLSX.utils.sheet_to_json(
                workbook.Sheets["All"] ?? {},
                { header: 1 }
            );
        }

        const NUM_BALLS = Math.ceil(
            this.config.time_limit / this.config.time_between_ball_spawns
        );
        const game_type = data.type || "accounting";
        if (game_type === "debit_credit") {
            this.elements = this.getRandomNBElements(NUM_BALLS);
            this.config.basket_types = [DEBIT, CREDIT];
            this.config.belt_types = [NONE, NONE, NONE, DEBIT, CREDIT];
            this.config.belt_labels = [4, 5];
        } else {
            this.elements = this.getRandomAllElements(NUM_BALLS);
            this.config.basket_types = [
                ASSETS,
                LIABITILITIES,
                STAKEHOLDERS_EQUITY,
                REVENUES,
                EXPENSES,
            ];
            this.config.belt_types = [
                ASSETS,
                LIABITILITIES,
                STAKEHOLDERS_EQUITY,
                REVENUES,
                EXPENSES,
            ];
            this.config.belt_labels = [1, 2, 3, 4, 5];
        }

        this.answer_stats = new Map(
            this.config.basket_types.map((type) => [
                type,
                { correct: 0, incorrect: 0 },
            ])
        );

        this.points = 0;
        this.game_over_timeout = this.config.time_limit / 1000;

        this.scene.launch("MenuScene");

        // keys
        this.keySpace = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.SPACE
        );
        this.keyEsc = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.ESC
        );

        this.W = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.A = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.S = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.D = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

        this.keyUp = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.UP
        );
        this.keyDown = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.DOWN
        );
        this.keyLeft = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.LEFT
        );
        this.keyRight = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.RIGHT
        );

        this.input.addPointer();
        this.mouse_down_last_frame = false;

        this.pit_fullnesses = [false, false, false, false];
        this.tooltip = new TooltipManager(this);

        // show system cursor in menus
        this.input.setDefaultCursor("default");
    }

    addBall() {
        if (this.ballCount < this.elements.length) {
            if (this.balls.getLength() < NUM_BALLS_AT_TIME) {
                let starting_conveyor_belt =
                    this.starting_conveyor_belts[
                        Math.floor(
                            Math.random() * this.starting_conveyor_belts.length
                        )
                    ];
                let ball = new Ball(
                    this,
                    starting_conveyor_belt.x,
                    starting_conveyor_belt.y,
                    this.elements[this.ballCount].name,
                    this.elements[this.ballCount].type,
                    this.difficulty
                );
                let hit_box_radius = Math.min(
                    ball.hit_box_radius,
                    (this.ball_pit_height / 5) * 2
                );
                ball.body.setCircle(hit_box_radius);
                ball.body.offset.x = -hit_box_radius;
                ball.body.offset.y = -hit_box_radius;
                ball.start();
                this.balls.add(ball);
                this.ballCount++;
            }
        }
    }

    checkForBall(ball, basket) {
        if (ball.state !== "picked" && ball.pit_number == null) {
            if (ball.type === basket.type.toLowerCase()) {
                this.points += ball.been_in_wrong_basket
                    ? RIGHT_NOT_FIRST_TIME_SCORE
                    : RIGHT_FIRST_TIME_SCORE;
                this.scene.get("HudScene").update_points(this.points);
                ball.destroyBall();
                this.answer_stats.get(basket.type).correct += 1;
                this.sound.play("correct", { volume: 1 });
            } else {
                this.sound.play("error", { volume: 1 });
                ball.goToPit();
                this.answer_stats.get(basket.type).incorrect += 1;
            }
        }
    }

    getRandomNBElements(total) {
        const credits = this.normalBalance
            .map((row) => row?.[1])
            .filter(Boolean);
        const debits = this.normalBalance
            .map((row) => row?.[0])
            .filter(Boolean);
        const [creditNum, debitNum] = this.generateRandomNumbers(
            total,
            2,
            false
        );
        const creditSamples = this.sample(credits, creditNum).map((name) => ({
            name,
            type: "credit",
        }));
        const debitSamples = this.sample(debits, debitNum).map((name) => ({
            name,
            type: "debit",
        }));
        return this.shuffle([...creditSamples, ...debitSamples]);
    }

    getRandomAllElements(total) {
        const typeNames = [
            "assets",
            "liabilities",
            "stakeholders equity",
            "expenses",
            "revenues",
        ];
        const colCount = this.allSheet[0]?.length ?? 0;
        const typeNums = this.generateRandomNumbers(total, colCount, false);

        return this.shuffle(
            Array.from({ length: colCount }).flatMap((_, i) => {
                const col = this.allSheet
                    .map((row) => row?.[i])
                    .filter(Boolean);
                return this.sample(col, typeNums[i]).map((name) => ({
                    name,
                    type: typeNames[i] ?? `type${i}`,
                }));
            })
        );
    }

    sample(arr, count) {
        return arr
            .slice()
            .sort(() => Math.random() - 0.5)
            .slice(0, count);
    }
    shuffle(arr) {
        return arr.slice().sort(() => Math.random() - 0.5);
    }
    generateRandomNumbers(sum, count, equal = true) {
        if (equal) return Array(count).fill(Math.ceil(sum / count));
        const points = Array.from({ length: count - 1 }, () =>
            Math.floor(Math.random() * (sum - count + 1))
        ).sort((a, b) => a - b);
        points.unshift(0);
        points.push(sum);
        return Array.from(
            { length: count },
            (_, i) => points[i + 1] - points[i]
        );
    }

    create() {
        if (this.sound.locked) {
            this.sound.once("unlocked", () => {
                this.game.musicManager.play(this, "game_bgm");
            });
        } else {
            this.game.musicManager.play(this, "game_bgm");
        }
        this.add.image(0, 0, "background").setOrigin(0, 0);

        // conveyor belts + baskets
        let belts_chosen = this.config.belt_labels;
        let belt_types = this.config.belt_types;

        this.conveyor_belts = [];
        this.baskets = [];
        this.starting_conveyor_belts = [];
        belts_chosen.forEach((belt_label) => {
            this.conveyor_belts.push(new ConveyorBelt(this));
            const BELT_HEIGHT =
                this.conveyor_belts[this.conveyor_belts.length - 1].height;

            function get_pos_from_belt_and_num(scene, belt_label, belt_num) {
                let x, y;
                if (belt_label === 2 || belt_label === 3) {
                    x = (scene.scale.width / 4) * belt_label;
                    y = belt_num * BELT_HEIGHT + BELT_HEIGHT / 2;
                } else if (belt_label === 1) {
                    x = (scene.scale.width / 4) * belt_label;
                    y =
                        scene.scale.height -
                        (belt_num * BELT_HEIGHT + BELT_HEIGHT / 2);
                } else if (belt_label === 5) {
                    y = (scene.scale.height / 3) * (belt_label - 3);
                    x = belt_num * BELT_HEIGHT + BELT_HEIGHT / 2;
                } else if (belt_label === 4) {
                    y = (scene.scale.height / 3) * (belt_label - 3);
                    x =
                        scene.scale.width -
                        (belt_num * BELT_HEIGHT + BELT_HEIGHT / 2);
                } else {
                    throw new Error("Undefined Conveyor Belt Choice");
                }
                return [x, y];
            }

            let [x, y] = get_pos_from_belt_and_num(this, belt_label, 0);
            this.conveyor_belts[
                this.conveyor_belts.length - 1
            ].set_pos_and_belt_label(x, y, belt_label);
            this.starting_conveyor_belts.push(
                this.conveyor_belts[this.conveyor_belts.length - 1]
            );

            let num_belts = NONE;
            if ([1, 2, 3].includes(belt_label)) {
                num_belts = this.scale.height / BELT_HEIGHT;
            } else if ([4, 5].includes(belt_label)) {
                num_belts = this.scale.width / BELT_HEIGHT;
            }

            let belt_num = 1;
            while (belt_num < num_belts - 2) {
                this.conveyor_belts.push(new ConveyorBelt(this));
                let [bx, by] = get_pos_from_belt_and_num(
                    this,
                    belt_label,
                    belt_num
                );
                this.conveyor_belts[
                    this.conveyor_belts.length - 1
                ].set_pos_and_belt_label(bx, by, belt_label);
                belt_num++;
            }

            let [basket_x, basket_y] = get_pos_from_belt_and_num(
                this,
                belt_label,
                belt_num
            );
            let basket = new Basket(
                this,
                basket_x,
                basket_y,
                belt_types[belt_label - 1]
            );
            this.tooltip.attachTo(
                basket,
                DESCRIPTION_MAP.get(belt_types[belt_label - 1]),
                { maxWidth: 250, fontSize: 14, padding: 5 }
            );

            this.baskets.push(basket);
        });

        this.conveyor_belts.forEach((belt) => {
            if ([1, 2, 3].includes(belt.belt_label))
                this.children.bringToTop(belt);
        });
        this.baskets.forEach((basket) => this.children.bringToTop(basket));

        const BELT_WIDTH = this.conveyor_belts[0].width;
        this.get_ball_pit_x = (num) => (this.scale.width / 4) * (num + 0.5);
        this.ball_pit_y = (this.scale.height / 3) * 1.5;
        this.ball_pit_width = this.scale.width / 4 - BELT_WIDTH;
        this.ball_pit_height = this.scale.height / 3 - BELT_WIDTH;

        this.balls = this.add.group();
        this.player = new Player({ scene: this });
        this.player.lastControl = "mouse"; // default

        const move_along_conveyor_belt = (scene, conveyor_belt, obj) => {
            if (obj.state === "picked" || obj.moved_by_belt_this_frame) return;
            obj.moved_by_belt_this_frame = true;
            if (
                conveyor_belt.belt_label === 2 ||
                conveyor_belt.belt_label === 3
            ) {
                obj.y += scene.scale.height / config.time_move_across_screen;
            } else if (conveyor_belt.belt_label === 1) {
                obj.y -= scene.scale.height / config.time_move_across_screen;
            } else if (conveyor_belt.belt_label === 4) {
                obj.x -= scene.scale.width / config.time_move_across_screen;
            } else if (conveyor_belt.belt_label === 5) {
                obj.x += scene.scale.width / config.time_move_across_screen;
            }
        };

        this.physics.add.overlap(
            this.conveyor_belts,
            this.balls,
            (belt, ball) => {
                if (ball.state !== "picked") {
                    if (ball.direction_belt_label == null)
                        ball.direction_belt_label = belt.belt_label;
                    if (belt.belt_label == ball.direction_belt_label)
                        move_along_conveyor_belt(this, belt, ball);
                }
            }
        );
        this.physics.add.overlap(this.balls, this.baskets, (ball, basket) =>
            this.checkForBall(ball, basket)
        );

        this.game.events.on("start-game", () => {
            this.scene.stop("MenuScene");
            this.input.setDefaultCursor("none"); // hide mouse in gameplay
            this.difficulty = parseInt(localStorage.getItem("difficulty") || 1);
            this.time.addEvent({
                delay: this.config.time_between_ball_spawns,
                callback: this.addBall,
                callbackScope: this,
                loop: true,
            });
            this.scene.launch("HudScene", {
                remaining_time: this.game_over_timeout,
            });
            this.conveyor_belts.forEach((belt) => belt.start());
            this.player.start();

            this.time.addEvent({
                delay: 1000,
                loop: true,
                callback: () => {
                    if (this.game_over_timeout === 0) {
                        this.game.events.emit("exit-game");
                        this.scene.start("GameOverScene", {
                            points: this.points,
                        });
                    } else {
                        this.game_over_timeout--;
                        this.scene
                            .get("HudScene")
                            .update_timeout(this.game_over_timeout);
                    }
                },
            });
        });

        this.game.events.on("exit-game", () => {
            this.game.events.removeListener("start-game");
            this.scene.stop("HudScene");
            this.input.setDefaultCursor("default"); // show mouse again
        });
    }

    update(time, delta) {
        this.conveyor_belts.forEach((belt) => belt.update(time, delta));
        this.player.update(time, delta);
        this.balls.getChildren().forEach((ball) => {
            ball.update(time, delta);
            ball.checkHover(this.player);
        });

        // Build one direction object from BOTH WASD and arrow keys
        let dir = { up: false, down: false, left: false, right: false };

        if (this.keyUp.isDown || this.W.isDown) {
            dir.up = true;
            this.player.lastControl = "keyboard";
        }
        if (this.keyDown.isDown || this.S.isDown) {
            dir.down = true;
            this.player.lastControl = "keyboard";
        }
        if (this.keyRight.isDown || this.D.isDown) {
            dir.right = true;
            this.player.lastControl = "keyboard";
        }
        if (this.keyLeft.isDown || this.A.isDown) {
            dir.left = true;
            this.player.lastControl = "keyboard";
        }

        // Move once per frame using normalized vector inside Player.move()
        this.player.move(dir);

        if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
            this.scene.pause();
            this.scene.launch("PauseScene");
            this.input.setDefaultCursor("default"); // show mouse in pause
        }

        // --- Input: pick/drop ---
        if (
            Phaser.Input.Keyboard.JustDown(this.keySpace) ||
            (this.input.activePointer.leftButtonDown() &&
                !this.mouse_down_last_frame)
        ) {
            if (this.player.ball && this.player.ball.state === "picked") {
                this.player.drop();
            } else {
                let picked_up_ball = false;
                this.balls.getChildren().forEach((ball) => {
                    if (picked_up_ball) return;
                    if (
                        Phaser.Geom.Intersects.RectangleToRectangle(
                            ball.getBounds(),
                            this.player.getBounds()
                        )
                    ) {
                        this.player.pick(ball);
                        picked_up_ball = true;
                    }
                });
            }
        }

        // Right click → drop
        if (this.input.activePointer.rightButtonDown() && this.player.ball) {
            this.player.drop();
        }

        this.mouse_down_last_frame = this.input.activePointer.leftButtonDown();
    }
}

