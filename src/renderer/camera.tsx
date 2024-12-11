import React, { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import actor, { Actor } from "@/src/engine/actor";
import draw from "@/src/engine/draw";
import exec from "../engine/exec";

export default function Camera({
  children,
}: React.PropsWithChildren<{}>): React.JSX.Element {
  const [actors, setActors] = useState<Actor[]>(() => [
    ...actor.plugin.filter(({ at }) => !!at),
  ]);
  // Subscribe to the frames...
  useEffect(
    () =>
      exec.afterFrame.add(() =>
        setActors([...actor.plugin.filter(({ at }) => !!at)])
      ),
    []
  );
  return (
    <div
      className={`flex-none self-center justify-self-center w-6/12 aspect-[4/3] relative`}
    >
      <AnimatePresence>{actors.map((it) => draw.draw(it))}</AnimatePresence>
      {children}
    </div>
  );
}
