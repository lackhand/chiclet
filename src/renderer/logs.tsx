import React, { useCallback, useSyncExternalStore } from "react";
import history from "../engine/history";

export default function Logs(): React.JSX.Element {
  const logs = useSyncExternalStore(
    useCallback((cb) => history.onEvent.add(cb), []),
    () => history.data
  );
  return (
    <table className="table-fixed border-collapse border-slate-900 border-solid border-2 text-center">
      <thead>
        <tr className="text-2xl font-semibold">
          <th className="border text-left">Event #</th>
          <th className="border font-mono">Type</th>
          <th className="border font-bold">Key</th>
          <th className="border">Payload</th>
        </tr>
      </thead>
      <tbody>
        {(logs as any[]).map(({ i, type, key, text, opts }) => (
          <tr
            key={`${i}.${type}`}
            className="odd:bg-slate-300 even:bg-slate-100"
          >
            <td className="border text-left">{i}</td>
            <td className="border font-mono">{type}</td>
            <td className="border font-bold">{key}</td>
            <td className="border">{text ?? opts}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
