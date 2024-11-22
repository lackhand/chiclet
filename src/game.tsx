import Executor from "@/src/engine/executor";
import Parser from "@/src/engine/parser";
import Rand from "@/src/vn/rand";
import * as Handlers from "@/src/vn/handlers";
import Tell from "@/src/vn/tell";
import Pubsub from "@/src/util/pubsub";
import Screenplay from "./vn/screenplay";
import React, { useMemo } from "react";
import Dummy from "@/src/vn/dummies";
import Log from "@/src/vn/log";
import Evaluator from "@/src/engine/evaluator";
import Renderer from "@/src/renderer";

export default function Game({}): React.JSX.Element {
  const executor = useMemo(() => {
    const handlers = Object.fromEntries(
      Object.entries(Handlers).map(([k, v]) => [k, v.parse])
    );

    // Give ourselves some aliases.
    handlers.choice = handlers.opt = handlers.ask;
    // Parse the thing with unrecognized leaf as Tell, and with top level values as Scenes.
    const executor = new Executor({
      parser: new Parser(handlers, Tell.parse),
      plugins: [
        Pubsub,
        Screenplay,
        Evaluator,
        Rand,
        Log,
        Dummy.SceneStart,
        Dummy.PrintLog,
        Renderer,
      ],
    });

    executor.run();
    return executor;
  }, []);

  return <div>{executor.plugin(Renderer)?.render()!}</div>;
}
