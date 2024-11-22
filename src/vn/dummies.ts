import Executor, { Dollar } from "@/src/engine/executor";
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
  export(_into: Dollar): void {}
  import(_from: Dollar): void {}
  process(_event: any): any {
    return undefined;
  }
}

const ERROR_PREFIX = arr`error errors`;
export class PrintLog implements Plugin {
  export(_into: Dollar): void {}
  import(_from: Dollar): void {}
  constructor(executor: Executor) {
    const pubsub = executor.pubsub;
    pubsub.subscribe([], (topic, error) => {
      if (ERROR_PREFIX.includes(topic[0])) {
        console.error(topic, error);
      } else {
        console.log(topic, error);
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
