import { useCallback, useSyncExternalStore } from "react";
import ask from "../engine/ask";

function choose(i: number) {
  ask.plugin.setAnswer(i);
}

export default function useChoices() {
  const choices = useSyncExternalStore(
    useCallback((onChange: () => void) => ask.plugin.onAsk.add(onChange), []),
    useCallback(() => ask.plugin.asked, [])
  );
  return [choices, choose] as const;
}
