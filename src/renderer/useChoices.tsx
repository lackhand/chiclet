import { useSyncExternalStore } from "react";
import ask, { Choice } from "../engine/ask";

const choose = ask.plugin.setAnswer.bind(ask.plugin);

export default function useChoices(): [Choice[], (choice: number) => void] {
  const choices = useSyncExternalStore(
    (onChange: () => void) => ask.plugin.onAsk.add(onChange),
    () => ask.plugin.choices
  );
  return [choices, choose];
}
