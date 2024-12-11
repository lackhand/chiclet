import React, {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import useChoices from "./useChoices";
import Choices from "./choices";
import Dialog from "./dialog";
import Camera from "./camera";
import exec from "../engine/exec";
import unpropagated from "./unpropagated";
import actor from "../engine/actor";

const nextTell = unpropagated(() => exec.userReady());

export default function GamePane({}): React.JSX.Element {
  const [choices, choose] = useChoices();
  const actor = useFG();
  return (
    <LetterBox onClick={nextTell}>
      <Camera>
        <Choices choices={choices} choose={choose} />
        <Dialog actor={actor} next={nextTell} />
      </Camera>
    </LetterBox>
  );
}
function useFG() {
  return useSyncExternalStore(
    actor.plugin.onFG.boundAdd,
    useCallback(() => actor.plugin.fg, [])
  );
}

function useExecCount() {
  const [count, setCount] = useState(exec.count);
  useEffect(() => exec.afterFrame.add(() => setCount(exec.count)), []);
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
