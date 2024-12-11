import React, { useMemo } from "react";
import Card from "./card";
import Typewriter from "./typewriter";
import { ErrorBoundary } from "react-error-boundary";
import { type Actor } from "../engine/actor";

interface Props {
  actor: Actor;
  skip: boolean;
  isDoneTyping: boolean;
  onDoneTyping: () => void;
  onClick: (e: React.BaseSyntheticEvent) => void;
}

export default function Dialog({
  actor,
  skip,
  isDoneTyping,
  onDoneTyping,
  onClick,
}: Props): React.JSX.Element {
  const { name, actedOn, tell } = actor;
  const chars = useMemo(() => tell.split(""), [tell]);
  return (
    <div
      className={`absolute left-0 right-0 m-auto w-11/12 h-1/3 transition-all duration-150 ease-in-out flex flex-col ${
        chars?.length ? "-bottom-2" : "-bottom-1/3"
      }`}
      onClick={onClick}
    >
      {tell.length ? (
        <>
          <Nametag name={name} />
          <Card className="w-full basis-11/12">
            <ErrorBoundary fallback={<div>Something went wrong</div>}>
              <Typewriter
                key={actedOn}
                text={chars}
                skip={skip}
                onComplete={onDoneTyping}
              />
            </ErrorBoundary>
            {isDoneTyping ? undefined : <Throbber />}
          </Card>
        </>
      ) : undefined}
    </div>
  );
}

function Nametag({ name }: { name: string }) {
  return <Card className="ml-2 w-1/2 basis-1/12">{name}</Card>;
}

function Throbber({}) {
  return (
    <div className="inline-block animate-bounce w-8 h-8 absolute bottom-0 right-0 p-4 m-4">
      ▶️
    </div>
  );
}
