import Executor from "@/src/engine/executor";
import { arr, Path } from "@/src/util/objectPath";
import { Plugin, PluginConstructor } from "@/src/engine/plugin";
import Rand from "./rand";

export default class Dummy implements Plugin {
  static Tell: typeof Tell;
  static SceneStart: typeof SceneStart;
  static Ask: typeof Ask;
  static PrintLog: typeof PrintLog;
  static All: PluginConstructor[];

  constructor(executor: Executor, listenPrefix: Path, respondPrefix: Path) {
    console.log("dummy installed bridging", listenPrefix, "to", respondPrefix);
    const pubsub = executor.pubsub;
    pubsub.subscribe(listenPrefix, (suffix, event) => {
      console.log("considering", listenPrefix, suffix, event);
      setTimeout(() => {
        const response = this.process(event);
        console.log("responding", respondPrefix, suffix, response);
        pubsub.publish([...respondPrefix, ...suffix], response);
      }, executor.plugin(Rand).scale(1000, 250, "dummy"));
    });
  }
  process(_event: any): any {
    return undefined;
  }
}

export class PrintLog implements Plugin {
  constructor(executor: Executor) {
    const pubsub = executor.pubsub;
    pubsub.subscribe([], (topic, msg) => {
      switch (topic[topic.length - 1]) {
        case "debug":
          console.debug(topic, msg);
          break;
        case "warn":
          console.warn(topic, msg);
          break;
        case "error":
          console.error(topic, msg);
          break;
        default:
          console.log(topic, msg);
          break;
      }
    });
  }
}

export class Tell extends Dummy {
  constructor(executor: Executor) {
    super(executor, arr`tell`, arr`told`);
  }
}
export class SceneStart extends Dummy {
  constructor(executor: Executor) {
    super(executor, arr`scene start`, arr`scene ready`);
  }
}
export class Ask extends Dummy {
  private _exec: Executor;
  constructor(exec: Executor) {
    super(exec, arr`ask`, arr`answer`);
    this._exec = exec;
  }
  process(event: any): any {
    const options = event.options as { i: number }[];
    return this._exec.plugin(Rand).peek(options).i;
  }
}

Dummy.Tell = Tell;
Dummy.SceneStart = SceneStart;
Dummy.Ask = Ask;
Dummy.PrintLog = PrintLog;
Dummy.All = [PrintLog, Tell, SceneStart, Ask];
