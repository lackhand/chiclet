import React, { useContext, useEffect, useRef, useState } from "react";
import Clock from "@/src/util/clock";
import clockContext from "../clockContext";
import { motion } from "motion/react";
import { useCancellableEffect } from "./useCancellableEffect";

const CLASSES = [
  [/^\s+$/, 0.25],
  [/^[-.,;?!(){}\[\]]+$/, 1.25],
] as [regex: RegExp, mult: number][];
function classicDelay(delay = 40, classes = CLASSES) {
  return (s: string) => {
    let d = delay * s.length;
    for (let [regex, mult] of classes) {
      if (regex.test(s)) {
        d *= mult;
        break;
      }
    }
    return d;
  };
}
const defaultDelay = classicDelay();

type CSSClass = NonNullable<React.ComponentProps<"div">["className"]>;
export interface Props {
  key: any;
  text: string[];
  clock?: Clock;
  delay?: (s: string) => number;
  old?: CSSClass;
  new?: CSSClass;
  skip?: boolean;
  onComplete?: () => void;
}

export default function Typewriter({
  text,
  clock = useContext(clockContext)!,
  delay = defaultDelay,
  old = "opacity-0",
  new: _new = "opacity-100",
  skip = false,
  onComplete,
}: Props) {
  const spanRef = useRef<(null | HTMLElement)[]>([]);
  const [spans, setSpans] = useState<(null | HTMLElement)[]>([]);
  useEffect(() => {
    setSpans(spanRef.current.slice(0, text.length));
  }, [text]);

  const next = useRef(0);
  useEffect(() => {
    next.current = skip ? text.length : 0;
  }, [skip, text]);

  useCancellableEffect(
    async (continuing: () => boolean) => {
      if (!spans.length) {
        return;
      }
      while (continuing() && !skip && next.current < spans.length) {
        repaint(spans, next.current, old, _new);
        const waitTime = delay(text[next.current++]);
        await clock.timeout(waitTime);
      }
      repaint(spans, next.current, old, _new);
      onComplete?.();
    },
    [skip, text, spans]
  );

  return (
    <div>
      {text.map((word, i) => (
        <span
          key={i}
          ref={(e) => (spanRef.current[i] = e)}
          className={i < next.current ? _new : old}
        >
          {word}
        </span>
      ))}
    </div>
  );
}

function repaint(
  elements: (null | HTMLSpanElement)[],
  count: number,
  old: CSSClass,
  _new: CSSClass
) {
  for (let i = 0; i < count && i < elements.length; ++i) {
    const element = elements[i];
    if (!element) continue;
    element.className = _new;
  }
  for (let i = count; i < elements.length; ++i) {
    const element = elements[i];
    if (!element) continue;
    element.className = old;
  }
}
