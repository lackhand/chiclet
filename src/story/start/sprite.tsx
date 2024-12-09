import { motion, TargetAndTransition } from "motion/react";
import { Actor, Audio as ActorAudio } from "@/src/engine/actor";
import React, { useRef } from "react";
import stage from "@/src/engine/stage";
import rand from "@/src/engine/rand";
import * as audio from "./audio";

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
    let _: any;
    [_, animate.x, animate.y] = stage.atAbsolute(at);
  }
  animate.color = rand.stable(is ? `${key}${is}` : key.toString(), COLORS);
  Object.assign(animate, tween);

  return (
    <motion.div key={key} layout="position" animate={animate}>
      {audio?.src && <Audio {...audio} />}
      <div className="font-semibold text-lg">{name ?? key}</div>
      <div className="text-sm">
        is {is} at {at}
      </div>
      {tween && (
        <div className="text-sm">
          tween: <code>{JSON.stringify(tween)}</code>
        </div>
      )}
    </motion.div>
  );
}

function Audio({ ...audio }: ActorAudio): React.JSX.Element {
  const ref = useRef<HTMLAudioElement>(null);
  return <audio ref={ref} hidden autoPlay controls={false} {...audio} />;
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
