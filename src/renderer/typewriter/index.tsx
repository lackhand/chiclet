import React, { useEffect, useRef } from "react";
import { AnimationPlaybackControls, useAnimate } from "motion/react";
import classicDelay from "./classicDelay";

export interface Props {
  key: string | number;
  text: string[];
  delay?: (i: number, total: number) => number;
  skip: boolean;
  onComplete?: () => void;
}

export default function Typewriter({
  text,
  delay: rawDelay,
  skip,
  onComplete,
}: Props) {
  const [scope, animate] = useAnimate();
  const playbackControlsRef = useRef<AnimationPlaybackControls>();

  useEffect(() => {
    const current = playbackControlsRef.current;
    if (current) {
      current.speed = skip ? 1000 : 1;
    }
  }, [text, skip]);

  useEffect(() => {
    playbackControlsRef.current?.cancel();
    playbackControlsRef.current = undefined;
    if (!text?.length) {
      return;
    }
    const delay = rawDelay ?? classicDelay(text);

    const current = animate("span", { opacity: 1 }, { duration: 0, delay });
    current.time = 0;
    playbackControlsRef.current = current;

    if (onComplete) {
      current.then(onComplete, onComplete);
    }
    return () => {
      current.complete();
      if (playbackControlsRef.current === current) {
        playbackControlsRef.current = undefined;
      }
    };
  }, [text, rawDelay, onComplete]);

  return (
    <div key="text" ref={scope}>
      {text.map((word, i) => (
        <span key={i} style={{ opacity: 0 }}>
          {word}
        </span>
      ))}
    </div>
  );
}
