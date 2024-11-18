import Executor from "@/src/engine/executor";
import Pubsub, { Topic } from "@/src/util/pubsub";
import React from "react";
import { useEffect, useReducer } from "react";

interface Props {
  topics: string[];
  executor: Executor;
  scrollback?: number;
}
export default function ListLogger({
  executor,
  topics = ["scene", "ask", "tell"],
  scrollback = 1000,
}: Props) {
  const [log, dispatch] = useReducer(
    (oldState: [number, any, Topic][], newState: [number, any, Topic]) => {
      const result = [...oldState, ...newState];
      return result.slice(-scrollback);
    },
    [scrollback]
  );
  useEffect(() => {
    const symbol = Symbol("logger");
    let total = 0;
    for (let topic in topics) {
      executor.plugin(Pubsub).subscribe(topic, symbol, (e, t) => {
        dispatch([++total, e, t]);
      });
    }
    return () => {
      for (let topic in topics) {
        executor.plugin(Pubsub).unsubscribe(topic, symbol);
      }
    };
  }, [dispatch, executor, topics]);
  return (
    <ol>
      $
      {log.map(([i, e, t]) => (
        <li key={i} value={i} className="list-decimal">
          <div className="bg-blue-200 rounded-full inline-block">{t}</div>:{" "}
          <code>{JSON.stringify(e)}</code>
        </li>
      ))}
    </ol>
  );
}
