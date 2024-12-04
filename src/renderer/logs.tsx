import React, { useSyncExternalStore } from "react";
import history from "../engine/history";

export default function Logs(): React.JSX.Element {
  const logs = useSyncExternalStore(
    (onChange: () => void) => history.onEvent.add(onChange),
    () => history.data
  );
  console.log(
    "Displaying logs with seqs",
    logs.map((r) => r.i)
  );
  return (
    <table className="table-fixed border-collapse border-slate-900 border-solid border-2 text-center">
      <thead>
        <tr className="text-2xl font-semibold">
          <th className="border text-left">Event #</th>
          <th className="border font-mono">Type</th>
          <th className="border font-bold">Label</th>
          <th className="border">Text(s)</th>
        </tr>
      </thead>
      <tbody>
        {logs.map(({ i, type, label, texts }) => (
          <tr key={i} className="odd:bg-slate-300 even:bg-slate-100">
            <td className="border text-left">{i}</td>
            <td className="border font-mono">{type}</td>
            <td className="border font-bold">{label}</td>
            <td className="border">{texts}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
