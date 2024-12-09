import coolF from "./01_LOOP_COOL_ENOUGH.ogg";
import glitchyF from "./01_LOOP_GLITCHY.ogg";
import fanfareF from "./02_ONE_SHOT_FANFARRE.ogg";

function loop(file: string) {
  return { src: file, loop: true };
}
function once(file: string) {
  return { src: file };
}
export const cool = loop(coolF);
export const glitchy = loop(glitchyF);
export const fanfare = once(fanfareF);
