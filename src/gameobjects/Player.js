import { GameObjects, Physics } from "phaser";
import { Bullet } from "./Bullet";

export class Player extends Physics.Arcade.Image {
    state = "waiting";
    scene = null;
    bullets = null;
    ball = null;

    lastControl = "mouse"; 
    lastPointerX = 0;
    lastPointerY = 0;

    constructor({ scene }) {
        super(scene, -190, 100, "player");
        this.scene = scene;
        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);

        this.bullets = this.scene.physics.add.group({
            classType: Bullet,
            maxSize: 100,
            runChildUpdate: true
        });

        this.setDepth(114514);
        this.moved_by_belt_this_frame = false;
    }

    start() {
        this.state = "start";
        this.scene.tweens.add({
            targets: this,
            x: 200,
            duration: 800,
            delay: 1000,
            ease: "Power2",
            yoyo: false,
            onComplete: () => {
                this.state = "can_move";
            }
        });
    }

    move(direction) {
        if (this.state !== "can_move" || this.lastControl !== "keyboard") return;

        const speed = 5;
        let vx = 0;
        let vy = 0;

        if (direction.up) vy = -1;
        if (direction.down) vy = 1;
        if (direction.left) vx = -1;
        if (direction.right) vx = 1;

        // Normalize diagonal speed
        if (vx !== 0 && vy !== 0) {
            vx *= Math.SQRT1_2;
            vy *= Math.SQRT1_2;
        }

        this.x += vx * speed;
        this.y += vy * speed;
    }

    pick(ball) {
        if (this.ball && this.ball.state === "picked") return;
        this.ball = ball;
        this.ball.state = "picked";
        if (this.ball.pit_number != null) {
            this.scene.pit_fullnesses[this.ball.pit_number] = false;
            this.ball.pit_number = null;
        }
    }

    drop() {
        if (!this.ball) return;
        this.ball.direction_belt_label = null;
        this.ball.state = null;
        this.ball = null;
    }

    update() {
        this.moved_by_belt_this_frame = false;

        const pointer = this.scene.input.activePointer;

        if (
            pointer &&
            (pointer.worldX !== this.lastPointerX || pointer.worldY !== this.lastPointerY)
        ) {
            this.lastControl = "mouse";
        }

        if (this.state === "can_move" && this.lastControl === "mouse" && pointer) {
            this.x = pointer.worldX;
            this.y = pointer.worldY;
        }

        if (pointer) {
            this.lastPointerX = pointer.worldX;
            this.lastPointerY = pointer.worldY;
        }

        if (this.ball) {
            this.ball.setPosition(this.x, this.y - 20);
        }
    }
}
