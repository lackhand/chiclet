import React from "react";
import { Choice } from "@/src/engine/ask";

export default function Choices({
  choices,
  choose,
}: {
  choices?: Choice[];
  choose: (n: number) => void;
}): undefined | React.JSX.Element {
  if (!choices) {
    return undefined;
  }
  return (
    <div className="m-auto min-w-[50%] max-w-[91.6667%] flex flex-col justify-center items-center place-items-center">
      {choices.map(({ key, text }) => (
        <button
          key={key}
          className={`m-4 p-4 rounded-full border-4 border-solid border-slate-100 bg-slate-900 hover:bg-slate-700 text-slate-100 font-bold`}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            choose(key);
          }}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
