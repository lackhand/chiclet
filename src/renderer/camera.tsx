import React, { useEffect, useMemo } from "react";
import { AnimatePresence } from "motion/react";
import actor from "@/src/engine/actor";
import stage from "@/src/engine/stage";
import { type Tell } from "@/src/engine/history";
import draw from "@/src/engine/draw";

interface Props {
  tell: Tell;
  setGutterStyles: (styles: string) => void;
}
export default function Camera({
  setGutterStyles,
  tell,
  children,
}: React.PropsWithChildren<Props>): React.JSX.Element {
  const actors = useMemo(
    () => [...actor.plugin.filter((actor) => !!actor.at)],
    [tell]
  );
  useEffect(() => setGutterStyles(stage.), [tell]);
  return (
    <div
      className={`flex-none self-center justify-self-center w-6/12 aspect-[4/3] relative`}
    >
      <AnimatePresence>{actors.map((it) => draw.draw(it))}</AnimatePresence>
      {children}
    </div>
  );
}
