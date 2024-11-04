import "renjs";
import "phaser-ce";

const RenJS = (window as any).RenJS;
// export RenJS;
// export Plugin;

console.log("What now?!", RenJS);

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
  storyText: [
    "story/s0.yaml",
    "story/s1_1_bedroom.yaml",
    "story/s1_2_car.yaml",
    "story/s1_3_precinct.yaml",
  ],

  loadingScreen: {
    background: "assets/loaderloaderbackground.png",
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

const RenJSGame = new RenJS.game(config);
export default RenJSGame;
RenJSGame.launch();
