import Executor from "@/src/engine/executor";
import { Plugin as EnginePlugin } from "@/src/engine/plugin";
import React, { useCallback } from "react";
import ExecutorContext from "./executorContext";
import Sidebar from "./sidebar";
import Logs from "./logs";
import useChoices from "./useChoices";
import useDialog from "./useDialog";
import Choices from "./choices";
import Dialog from "./dialog";
import ClockContext from "./clockContext";

export default class Renderer implements EnginePlugin {
  private readonly _executor: Executor;
  constructor(executor: Executor) {
    this._executor = executor;
  }

  render(): React.JSX.Element {
    return (
      <ExecutorContext.Provider value={this._executor}>
        <ClockContext.Provider value={this._executor.clock}>
          <div className="w-screen h-screen">
            <Sidebar>
              <Logs />
            </Sidebar>
            <main className="w-full h-full">
              <GamePane />
            </main>
          </div>
        </ClockContext.Provider>
      </ExecutorContext.Provider>
    );
  }
}

function GamePane({}): React.JSX.Element {
  const [choices, choose] = useChoices();
  const [dialog, dialogNext] = useDialog();
  const saferDialogNext = useCallback(() => {
    console.log("Checking whether we think procession ok", choices);
    if (choices?.length) return;
    dialogNext();
  }, [choices, dialogNext]);

  return (
    <div
      className={`w-full h-full flex bg-red-900 justify-center align-middle`}
      onClick={dialogNext}
    >
      <div
        className={`flex-none self-center justify-self-center w-6/12 aspect-[4/3] bg-red-700 relative `}
      >
        <Choices choices={choices} choose={choose} />
        <Dialog dialog={dialog} next={saferDialogNext} />
      </div>
    </div>
  );
}
