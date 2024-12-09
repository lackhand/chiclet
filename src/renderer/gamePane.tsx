import React, { PropsWithChildren, useEffect, useMemo, useState } from "react";
import useChoices from "./useChoices";
import useTold from "./useTold";
import Choices from "./choices";
import Dialog from "./dialog";
import Camera from "./camera";
import exec, { Path } from "../engine/exec";

export default function GamePane({}): React.JSX.Element {
  const [gutterStyles, setGutterStyles] = useState("");
  const [choices, choose] = useChoices();
  const [told, toldNext] = useTold();
  return (
    <LetterBox onClick={toldNext}>
      <Camera setGutterStyles={setGutterStyles} told={told}>
        <Choices choices={choices} choose={choose} />
        <Dialog told={told} next={toldNext} />
      </Camera>
    </LetterBox>
  );
}

function useExecCount() {
  const [count, setCount] = useState(-1);
  useEffect(
    () =>
      exec.afterFrame.add(() => {
        setCount(exec.count);
      }),
    []
  );
  return count;
}

interface LetterBoxParams {
  onClick?: React.MouseEventHandler;
}
function LetterBox({ onClick, children }: PropsWithChildren<LetterBoxParams>) {
  const count = useExecCount();
  const gutterStyles = useMemo(() => {}, [count]);
  return (
    <div
      className={`w-full h-full flex justify-center align-middle ${gutterStyles}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
