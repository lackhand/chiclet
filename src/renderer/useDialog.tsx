import { useContext, useCallback, useRef, useSyncExternalStore } from "react";
import ExecutorContext from "./executorContext";
import { arr, Path } from "@/src/util/objectPath";
import { Value } from "@/src/engine/parser";

export type Dialog = {
  name: string;
  text: string;
  values: Value[];
  props: [[name: string, value: Value]];
};

const TELL_TOPIC = arr`tell`;
const TOLD_TOPIC = arr`told`;

export default function useDialog(): [
  dialog: undefined | Dialog,
  next: () => void
] {
  const executor = useContext(ExecutorContext)!;
  const lastDialog = useRef<undefined | [Path, Dialog]>(undefined);
  const dialog = useSyncExternalStore(
    (onChange: () => void): (() => void) => {
      function subscribe(topic: Path, msg: Dialog) {
        if (!msg.text || msg.values.includes("skip")) {
          executor.pubsub.publish([...TOLD_TOPIC, ...topic], undefined);
        }
        lastDialog.current = [topic, msg];
        onChange();
      }
      executor.pubsub.subscribe(TELL_TOPIC, subscribe);
      return () => executor.pubsub.unsubscribe(TELL_TOPIC, subscribe);
    },
    () => lastDialog.current?.[1]
  );
  const lastPath = lastDialog.current?.[0];
  const next = useCallback(() => {
    console.log("Evaluating next!");
    if (!lastPath) return;
    executor.pubsub.publish([...TOLD_TOPIC, ...lastPath], undefined);
  }, [lastPath]);
  return [dialog, next];
}
