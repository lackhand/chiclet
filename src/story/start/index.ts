import { scene } from "@/src/engine/beats";
import draw from "@/src/engine/draw";
import exec from "@/src/engine/exec";
import enactor from "@/src/renderer/enactor";
import { arr } from "@/src/util/objectPath";
import sprite from "./sprite";

draw.default = sprite;

const bg = enactor("bg");
const larry = enactor("larry");
const phoenix = enactor("phoenix");

export default scene(
  "default",
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
  "scene2",
  phoenix("You get it right?"),
  phoenix(() => "this just works?")
);
