import React, { useCallback } from "react";
import Sidebar from "./sidebar";
import Logs from "./logs";
import useChoices from "./useChoices";
import useTold from "./useTold";
import Choices from "./choices";
import Dialog from "./dialog";
import plugin from "../engine/plugins";

export class Renderer {
  render(): React.JSX.Element {
    return (
      <div className="w-screen h-screen">
        <Sidebar>
          <Logs />
        </Sidebar>
        <main className="w-full h-full">
          <GamePane />
        </main>
      </div>
    );
  }
}
export default plugin.add(new Renderer());

function GamePane({}): React.JSX.Element {
  const [choices, choose] = useChoices();
  const [told, toldNext] = useTold();
  const saferToldNext = useCallback(() => {
    console.log("Checking whether we think procession ok", choices);
    if (choices?.length) return;
    toldNext();
  }, [choices, toldNext]);

  return (
    <div
      className={`w-full h-full flex bg-red-900 justify-center align-middle`}
      onClick={toldNext}
    >
      <div
        className={`flex-none self-center justify-self-center w-6/12 aspect-[4/3] bg-red-700 relative `}
      >
        <Choices choices={choices} choose={choose} />
        <Dialog told={told} next={saferToldNext} />
      </div>
    </div>
  );
}
