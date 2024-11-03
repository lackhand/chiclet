import "./monogatari/debug";
import Monogatari from "./monogatari";
import "./main.css";
import "./options";
import "./storage";

/**
 * =============================================================================
 * This is the file where you should put all your custom JavaScript code,
 * depending on what you want to do, there are 3 different places in this file
 * where you can add code.
 *
 * 1. Outside the $_ready function: At this point, the page may not be fully
 *    loaded yet, however you can interact with Monogatari to register new
 *    actions, components, labels, characters, etc.
 *
 * 2. Inside the $_ready function: At this point, the page has been loaded, and
 *    you can now interact with the HTML elements on it.
 *
 * 3. Inside the init function: At this point, Monogatari has been initialized,
 *    the event listeners for its inner workings have been registered, assets
 *    have been preloaded (if enabled) and your game is ready to be played.
 *
 * You should always keep the $_ready function as the last thing on this file.
 * =============================================================================
 **/

// 1. Outside the $_ready function:
console.log("Before ready");
Monogatari.$_ready(() => {
  // 2. Inside the $_ready function:
  console.log("On ready");

  Monogatari.default.init("#monogatari").then(() => {
    // 3. Inside the init function:
    console.log("Completely ready");
  });
});
