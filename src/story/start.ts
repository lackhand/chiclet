import { loop, scene } from "@/src/engine/beats";
import draw from "@/src/engine/draw";
import exec from "@/src/engine/exec";
import enactor from "@/src/renderer/enactor";
import { arr } from "@/src/util/objectPath";
import sprite from "./start/sprite";
import ask from "../engine/ask";
import { millis } from "../util/promises";

draw.default = sprite;

const bg = enactor("bg");
const larry = enactor("larry");
const phoenix = enactor("phoenix");

export default scene(
  {
    name: "default",
    async preload() {
      console.warn("Preloading...");
      await millis(500);
      console.warn("Preloaded!");
    },
  },
  bg({ is: "coffeewav" }),
  larry({ name: "Laurence", is: "happy" }),
  phoenix({ name: () => "Phoenix", is: "upset" }),
  larry({ tell: "hello!" }),
  phoenix({ tell: () => `hello yourself, ${larry.name}!` }),
  bg({ is: "dramatic" }),
  larry({ tell: () => `I killed him ${phoenix.name}` }),
  { do: () => exec.pushAbsolute(arr`start scene2`) }
);

export const scene2 = scene(
  {
    name: "scene2",
    async preload() {
      console.log("YEAH PRELOAD YEAH");
    },
  },
  phoenix({ wise: 1, tell: "You get it right?" }),
  ask.object(() => ({
    "I do get it!": larry("Yeah I do!"),
    "I do _not_ get it!": {
      if: () => phoenix.wise,
      ...phoenix({
        tell: () => `I do not understand why we fall through, ${larry.name}`,
      }),
    },
    "Skipped are ok": {
      if: () => larry.wise,
      ...larry("Yeah it's great"),
    },
    "It'sfine": [larry("DOT JPEGG"), loop.break(10)],
  })),
  phoenix(() => "ANYWAY.")
);
