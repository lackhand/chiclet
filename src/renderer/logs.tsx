import React, { useContext, useSyncExternalStore } from "react";
import { arr } from "../util/objectPath";
import Log from "../vn/log";
import ExecutorContext from "./executorContext";

export default function Logs(): React.JSX.Element {
  const executor = useContext(ExecutorContext)!;
  const snapshot = useSyncExternalStore(
    (onStoreChange: () => void) => {
      executor.pubsub.subscribe(arr`logs`, onStoreChange);
      return () => executor.pubsub.unsubscribe(arr`logs`, onStoreChange);
    },
    () => executor.plugin(Log).data
  );
  console.log(
    "Displaying logs with seqs",
    snapshot.map((r) => r.i)
  );
  return (
    <table className="table-fixed border-collapse border-slate-900 border-solid border-2 text-center">
      <thead>
        <tr className="text-2xl font-bold">
          <th className="border text-left">Event #</th>
          <th className="border">Topic</th>
          <th className="border">Body</th>
        </tr>
      </thead>
      <tbody>
        {snapshot.map(({ i, topic, body }) => (
          <tr key={i} className="odd:bg-slate-300 even:bg-slate-100">
            <td className="border text-left">{i}</td>
            <td className="border">{topic.join(".")}</td>
            <td className="border">
              <code>{body}</code>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
