import { useContext, useState, useCallback, useEffect } from "react";
import ExecutorContext from "./executorContext";
import { arr } from "../util/objectPath";
import { DisplayOption } from "../vn/ask";

export default function useChoices(): [
  undefined | DisplayOption[],
  (choice: number) => void
] {
  const executor = useContext(ExecutorContext)!;
  const [choices, setChoices] = useState<DisplayOption[]>([]);
  useEffect(
    () =>
      executor.pubsub.subscribe(arr`ask`, (_topic, msg) => {
        setChoices(msg.options!);
      }),
    [executor]
  );
  useEffect(
    () =>
      executor.pubsub.subscribe(arr`echo answer`, (_topic, _msg) => {
        setChoices([]);
      }),
    [executor]
  );
  const choose = useCallback(
    (i: number) => {
      console.log("Choosing", i);
      executor.pubsub.publish(arr`answer`, i);
    },
    [choices, executor]
  );

  return [
    choices ?? undefined,
    choices
      ? choose
      : (discarded) => {
          console.error("Can't choose r/n, discarding", discarded);
        },
  ];
}
