import React, {
  DependencyList,
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

export default function GamePane({}): React.JSX.Element {
  const [choices, choose] = useChoices();
  const actor = useFG();

  const [skip, isDoneTyping, onDoneTyping, onClick] = useTyping([
    actor.actedOn,
  ]);

  return (
    <LetterBox onClick={onClick}>
      <Camera>
        <Choices choices={choices} choose={choose} />
        <Dialog {...{ actor, skip, isDoneTyping, onDoneTyping, onClick }} />
      </Camera>
    </LetterBox>
  );
}
function useFG() {
  return useSyncExternalStore(
    useCallback(
      (cb) =>
        actor.plugin.onFG.add(() => {
          // Give me time to read it!
          exec.trapUser();
          cb();
        }),
      []
    ),
    useCallback(() => actor.plugin.fg, [])
  );
}

function useTyping(deps: DependencyList) {
  const [doneTyping, setDoneTyping] = useDependentState(false, deps);
  const [skip, setSkip] = useDependentState(false, deps);
  const onClick = unpropagated(() => {
    if (doneTyping) {
      exec.userReady();
      return;
    }
    setSkip(true);
  });
  return [skip, doneTyping, () => setDoneTyping(true), onClick] as const;
}
function useDependentState<T>(initial: T, deps: DependencyList) {
  const [state, setState] = useState<T>(initial);
  useEffect(() => setState(initial), deps);
  return [state, setState] as const;
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
