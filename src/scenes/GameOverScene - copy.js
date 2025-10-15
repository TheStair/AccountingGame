// import { Scene } from "phaser";

// export class GameOverScene extends Scene {
//     end_points = 0;

//     constructor() {
//         super("GameOverScene");
//     }

//     init(data) {
//         this.cameras.main.fadeIn(1000, 0, 0, 0);
//         this.end_points = data.points || 0;

//         // Ensure global sfxVolume is restored
//         this.game.sfxVolume = parseFloat(localStorage.getItem("volume"));
//         if (isNaN(this.game.sfxVolume)) this.game.sfxVolume = 1.0;
//     }

//     create() {
//         // --- Background Music (menu_bgm) ---
//         if (this.sound.locked) {
//             this.sound.once("unlocked", () => {
//                 this.game.musicManager.setVolume(this.game.sfxVolume ?? 1.0);
//                 this.game.musicManager.play(this, "menu_bgm");
//             });
//         } else {
//             this.game.musicManager.setVolume(this.game.sfxVolume ?? 1.0);
//             this.game.musicManager.play(this, "menu_bgm");
//         }

//         // --- Backgrounds ---
//         this.add.image(0, 0, "background").setOrigin(0, 0);

//         const FIRST_RECTANGLE_HEIGHT = 180;
//         const SECOND_RECTANGLE_HEIGHT = 70;
//         const vertical_shift_to_center = -SECOND_RECTANGLE_HEIGHT / 2;

//         this.add
//             .rectangle(
//                 0,
//                 this.scale.height / 2 + vertical_shift_to_center,
//                 this.scale.width,
//                 FIRST_RECTANGLE_HEIGHT,
//                 0xd8dde3
//             )
//             .setAlpha(0.8)
//             .setOrigin(0, 0.5);

//         this.add
//             .rectangle(
//                 0,
//                 this.scale.height / 2 +
//                     FIRST_RECTANGLE_HEIGHT / 2 +
//                     SECOND_RECTANGLE_HEIGHT / 2 +
//                     vertical_shift_to_center,
//                 this.scale.width,
//                 SECOND_RECTANGLE_HEIGHT,
//                 0x000000
//             )
//             .setAlpha(0.8)
//             .setOrigin(0, 0.5);

//         // --- Game Over Text ---
//         const gameover_text = this.add
//             .bitmapText(
//                 this.scale.width / 2,
//                 this.scale.height / 2 + vertical_shift_to_center - 20,
//                 "knighthawks",
//                 "GAME\nOVER",
//                 62,
//                 1
//             )
//             .setOrigin(0.5, 0.5);
//         gameover_text.postFX.addShine();

//         // --- Score Display ---
//         this.add
//             .bitmapText(
//                 this.scale.width / 2,
//                 this.scale.height / 2 + 65 + vertical_shift_to_center,
//                 "pixelfont",
//                 `YOUR POINTS: ${this.end_points}`,
//                 24
//             )
//             .setOrigin(0.5, 0.5)
//             .setTint(0x000000);

//         // --- Play Again Button ---
//         const playAgainText = this.add
//             .text(
//                 this.scale.width / 4,
//                 this.scale.height / 2 +
//                     FIRST_RECTANGLE_HEIGHT / 2 +
//                     SECOND_RECTANGLE_HEIGHT / 2 +
//                     vertical_shift_to_center,
//                 "Play Again",
//                 {
//                     fontSize: "32px",
//                     color: "#ffffff",
//                     padding: { left: 10, right: 10, top: 5, bottom: 5 },
//                 }
//             )
//             .setOrigin(0.5)
//             .setInteractive();

//         const playAgainTextRect = this.add.rectangle(
//             playAgainText.x,
//             playAgainText.y,
//             playAgainText.width,
//             playAgainText.height
//         );
//         playAgainTextRect.setStrokeStyle(2, 0xffffff);

//         playAgainText.on("pointerdown", () => {
//             if (this.game.sfxVolume > 0) {
//                 this.sound.play("selection", { volume: this.game.sfxVolume });
//             }
//             if (this.game.musicManager) {
//                 this.game.musicManager.stop(); // stop menu music cleanly
//             }
//             this.scene.start("MainScene");
//         });

//         // --- Main Menu Button ---
//         const mainMenuText = this.add
//             .text(
//                 (this.scale.width * 3) / 4,
//                 this.scale.height / 2 +
//                     FIRST_RECTANGLE_HEIGHT / 2 +
//                     SECOND_RECTANGLE_HEIGHT / 2 +
//                     vertical_shift_to_center,
//                 "Main Menu",
//                 {
//                     fontSize: "32px",
//                     color: "#ffffff",
//                     padding: { left: 10, right: 10, top: 5, bottom: 5 },
//                 }
//             )
//             .setOrigin(0.5)
//             .setInteractive();

//         const mainMenuTextRect = this.add.rectangle(
//             mainMenuText.x,
//             mainMenuText.y,
//             mainMenuText.width,
//             mainMenuText.height
//         );
//         mainMenuTextRect.setStrokeStyle(2, 0xffffff);

//         mainMenuText.on("pointerdown", () => {
//             if (this.game.sfxVolume > 0) {
//                 this.sound.play("selection", { volume: this.game.sfxVolume });
//             }
//             if (this.game.musicManager) {
//                 this.game.musicManager.stop(); // stop menu music cleanly
//             }
//             this.scene.start("MainMenuScene");
//         });
//     }
// }
