import * as RenJS from "renjs";
// import Phaser from "phaser-ce";

const config = {
  name: "Quickstart",
  w: 800,
  h: 600,
  renderer: Phaser.AUTO,
  scaleMode: Phaser.ScaleManager.SHOW_ALL,
  splash: {
    loadingScreen: "assets/gui/loaderloaderbackground.png",
    loadingBar: {
      asset: "assets/gui/loaderloading-bar.png",
      position: {
        x: 109,
        y: 458,
      },
      size: {
        w: 578,
        h: 82,
      },
    },
  },
  fonts: "assets/gui/fonts.css",
  guiConfig: "story/GUI.yaml",
  storyConfig: "story/Config.yaml",
  storySetup: "story/Setup.yaml",
  storyText: ["story/Story.yaml"],

  loadingScreen: {
    background: "assets/leaderloaderbackground.png",
    loadingBar: {
      asset: "assets/loaderloading-bar.png",
      position: { x: 0.0, y: 0.0 },
      direction: 1.0,
      size: { w: 100.0, h: 16.0 },
    },
    fade: true,
  },
  parent: "app",
  userScale: function userScale(scale: unknown, parent: unknown) {
    throw { msg: "Not sure how to handle!", scale, parent };
  },
  storyAccessibility: "story/a11y.yaml",
};

console.log(RenJS);
const RenJSGame = new RenJS.game(config);
export default RenJSGame;
RenJSGame.launch();
