import { motion, TargetAndTransition } from "motion/react";
import { Actor, Audio as ActorAudio, Is } from "@/src/engine/actor";
import React from "react";
import stage from "@/src/engine/stage";
import rand from "@/src/engine/rand";
// import * as audio from "./audio";
import { Key } from "@/src/engine/exec";

export default function sprite({
  key,
  name,
  is,
  at,
  audio,
  tween,
}: Actor): React.JSX.Element {
  const animate: TargetAndTransition = {};
  if (at) {
    [animate.x, animate.y] = stage.getPixels(at);
  }
  animate.color = rand.stable(is ? `${key}${is}` : key.toString(), COLORS);
  Object.assign(animate, tween);

  return (
    <motion.div key={key} layout="position" animate={animate}>
      <div className="font-semibold text-lg">
        {name} (#<code>{key}</code>)
      </div>
      <div className="text-sm">
        ${is} @{JSON.stringify(at)} sound:{doAudio(key, is, audio)}
      </div>
      {tween && (
        <div className="text-sm">
          tween: <code>{JSON.stringify(tween)}</code>
        </div>
      )}
    </motion.div>
  );
}

function doAudio(key: Key, is?: Is, audio?: ActorAudio): undefined | string {
  let values = [key && { key }, is && { is }, audio && { audio }].filter(
    (it) => !!it
  );
  if (values.length <= 0) return undefined;
  return JSON.stringify(values.reduce(Object.assign, {}));
}

const COLORS = [
  "violet",
  "red",
  "orange",
  "yellow",
  "neutral",
  "green",
  "cyan",
  "blue",
  "indigo",
];
