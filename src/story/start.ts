import { scene } from "../engine/beats";
import exec from "../engine/exec";
import { arr } from "../util/objectPath";
import { bg, phoenix, larry } from "./actors";
export default scene(
  "default",
  bg({ is: "coffeewav" }),
  larry({ display: "Laurence", is: "happy" }),
  phoenix({ display: () => "Phoenix", is: "upset" }),
  larry({ tell: "hello!" }),
  phoenix({ tell: () => `hello yourself, ${larry.display}!` }),
  bg({ is: "dramatic" }),
  larry({ tell: () => `I killed him ${phoenix.display}` }),
  { do: () => exec.pushAbsolute(arr`start scene2`) }
);

export const scene2 = scene(
  "scene2",
  phoenix("You get it right?"),
  phoenix(() => "this just works?")
);
