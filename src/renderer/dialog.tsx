import React, { DependencyList, useEffect, useMemo, useState } from "react";
import Card from "./card";
import Typewriter from "./typewriter";
import { ErrorBoundary } from "react-error-boundary";
import { Told } from "../engine/tell";
import actor, { Key } from "../engine/actor";

interface Props {
  told: Told;
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

export default function Dialog({ told, next }: Props): React.JSX.Element {
  const flat = useMemo(() => told.texts.join("\n"), [told]);
  const chars = useMemo(() => flat.split("") ?? [], [flat]);
  const [typing, setTyping] = useDependentState(true, [told]);
  const [skip, setSkip] = useDependentState(false, [told]);
  return (
    <div
      className={`absolute left-0 right-0 m-auto w-11/12 h-1/3 transition-all duration-150 ease-in-out flex flex-col ${
        chars?.length ? "-bottom-2" : "-bottom-1/3"
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
      {chars.length ? (
        <>
          <Nametag name={told.actor.name} />
          <Card className="w-full basis-11/12">
            <ErrorBoundary fallback={<div>Something went wrong</div>}>
              <Typewriter
                key={flat}
                text={chars}
                skip={skip}
                onComplete={() => setTyping(false)}
              />
            </ErrorBoundary>
            {typing ? undefined : <Throbber />}
          </Card>
        </>
      ) : undefined}
    </div>
  );
}

function Nametag({ name }: { name: Key }) {
  const display = (actor.plugin.get(name).name ??= name);
  return <Card className="ml-2 w-1/2 basis-1/12">{display}</Card>;
}

function Throbber({}) {
  return (
    <div className="inline-block animate-bounce w-8 h-8 absolute bottom-0 right-0 p-4 m-4">
      ⏳
    </div>
  );
}
