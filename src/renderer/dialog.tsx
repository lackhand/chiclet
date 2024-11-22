import React, {
  DependencyList,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Dialog as DialogType } from "./useDialog";
import Card from "./card";
import Typewriter from "./typewriter/typewriter";

interface Props {
  dialog?: DialogType;
  next: () => void;
}

function useDependentState<T>(
  initial: T,
  deps: DependencyList
): ReturnType<typeof useState<T>> {
  const [state, setState] = useState<T>();
  useEffect(() => setState(initial), deps);
  return [state, setState];
}

export default function Dialog({ dialog, next }: Props): React.JSX.Element {
  const text = useMemo(() => dialog?.text?.split("") ?? [], [dialog?.text]);
  const [typing, setTyping] = useDependentState(true, [text]);
  const [skip, setSkip] = useDependentState(false, [text]);
  const onComplete = useCallback(() => setTyping(false), [setTyping]);
  return (
    <div
      className={`absolute left-0 right-0 m-auto w-11/12 h-1/3 transition-all duration-150 ease-in-out flex flex-col ${
        text?.length ? "-bottom-2" : "-bottom-1/3"
      }`}
      onClick={(e) => {
        console.log("Trying the onclick");
        e.stopPropagation();
        if (typing) {
          console.log("Not done, so skipping ahead...");
          setSkip(true);
          return;
        }
        console.log("trying to paginate up...");
        next();
      }}
    >
      {dialog && (
        <>
          <Nametag dialog={dialog} />
          <Card className="w-full basis-11/12">
            <Typewriter key={dialog.text} {...{ text, skip, onComplete }} />
            {typing ? undefined : <Throbber />}
          </Card>
        </>
      )}
    </div>
  );
}

function Nametag({ dialog }: { dialog: DialogType }) {
  return <Card className="ml-2 w-1/2 basis-1/12">{dialog.name}</Card>;
}

function Throbber({}) {
  return (
    <div className="inline-block animate-bounce w-8 h-8 absolute bottom-0 right-0 p-4 m-4">
      ⏳
    </div>
  );
}
