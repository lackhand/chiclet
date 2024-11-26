import React, { useCallback, useEffect, useRef } from "react";
import { AnimationPlaybackControls, useAnimate } from "motion/react";
import classicDelay from "./classicDelay";

export interface Props {
  key: any;
  text: string[];
  delay?: (i: number, total: number) => number;
  skip?: boolean;
  onComplete?: () => void;
}

export default function Typewriter({
  text,
  delay: rawDelay,
  skip = false,
  onComplete,
}: Props) {
  const [scope, animate] = useAnimate();
  const playbackControlsRef = useRef<AnimationPlaybackControls>();
  const delay = useCallback(rawDelay ?? classicDelay(text), [text, rawDelay]);
  useEffect(() => {
    playbackControlsRef.current?.cancel();
    playbackControlsRef.current = undefined;
    if (!text?.length) {
      return;
    }
    const current = (playbackControlsRef.current = animate(
      "span",
      { opacity: 1 },
      { duration: 0, delay }
    ));
    if (onComplete) {
      current.then(onComplete, onComplete);
    }
    return () => {
      current.complete();
      if (playbackControlsRef.current === current) {
        playbackControlsRef.current = undefined;
      }
    };
  }, [text, onComplete]);
  useEffect(() => {
    const current = playbackControlsRef.current;
    if (skip && current) {
      current.speed = 1000;
    }
  }, [text, skip]);

  return (
    <div ref={scope}>
      {text.map((word, i) => (
        <span key={i} style={{ opacity: 0 }}>
          {word}
        </span>
      ))}
    </div>
  );
}
