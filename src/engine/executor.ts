import Stack from "@/src/util/stack";
import { arr, Key, Path } from "@/src/util/objectPath";
import Action from "@/src/engine/action";
import { Batcher } from "@/src/util/promises";
import {
  PluginSource,
  Plugin,
  Pubsub,
  PluginClass,
  ActionLookup,
  RequiredPlugins,
  Evaluator,
  PluginConstructor,
  isSerializablePlugin,
} from "./plugin";
import Clock from "../util/clock";

type Frame = Path;
export interface CoreProps {
  vars?: undefined | Record<string, any>;
  plugins: RequiredPlugins;
}
export type Props<T = any> = CoreProps & Partial<T>;

export default class Executor {
  private readonly _clock = new Clock();
  public readonly props: Readonly<Props>;
  private readonly _plugins = new Map<PluginClass, Plugin>();
  private readonly _pluginInstances: Plugin[] = [];
  private readonly _frames = new Stack<Frame>();
  private _frame: Frame = [];

  get peek() {
    return this._frame;
  }
  get clock() {
    return this._clock;
  }
  get next() {
    return this._frames.peek;
  }
  constructor(props: Props) {
    this.props = props;
    // We have to initialize plugins first -- even the pubsub tool is a plugin!
    for (let pluginSource of props.plugins) {
      this.install(pluginSource);
    }
  }

  install(pluginSource: PluginSource) {
    const instance: Plugin =
      typeof pluginSource == "function"
        ? new (pluginSource as PluginConstructor)(this)
        : pluginSource;
    if (this._pluginInstances.includes(instance)) {
      console.error("Duplicate", instance, "already installed!");
    }
    this._pluginInstances.push(instance);
    let proto = instance;
    let ctor = null;
    while (proto && (ctor = proto.constructor)) {
      this._plugins.set(ctor, instance);
      proto = Object.getPrototypeOf(proto);
    }
  }

  import(serialized: any) {
    while (!this._frames.isEmpty) {
      this.pop();
    }
    // This is the hard one -- we don't allow anyone to reset vars...
    for (let frame of serialized.stack) {
      this.pushAbsolute(frame as Path);
    }
    this._frame = serialized.frame;
    for (let plugin of this._pluginInstances) {
      if (!isSerializablePlugin(plugin)) continue;
      plugin.import(serialized);
    }
  }

  async export(cb: (vars: any) => PromiseLike<void>): Promise<void> {
    const serialized = { stack: this._frames.values, frame: this._frame };
    for (let plugin of this._pluginInstances) {
      if (!isSerializablePlugin(plugin)) continue;
      plugin.export(serialized);
    }
    await cb(serialized);
  }

  plugin<T extends Plugin>(key: PluginClass<T>): T {
    return (
      (this._plugins.get(key)! as T) ??
      (() => {
        console.error("Missing plugin", key, "of", [...this._plugins.keys()]);
        throw new Error();
      })()
    );
  }
  get pluginInstances() {
    return this._pluginInstances;
  }

  pushRelative(partial: Path): Path {
    return this.pushAbsolute([...this.peek!, ...partial]);
  }

  pushAbsolute(path: Path): Path {
    this._frames.push(path);
    this.plugin(Pubsub).publish(STACK_PUSHED, path);
    return path;
  }

  pop(): undefined | Path {
    const path = this._frames.pop();
    this.plugin(Pubsub).publish(STACK_POPPED, path);
    return path;
  }

  private _action: undefined | Action;
  get action() {
    return this._action!;
  }

  async run(start?: undefined | null | Key | Path): Promise<void> {
    this.setStart(start);
    try {
      this.plugin(Pubsub).publish(ENGINE_BEFORE, this);
      let frame;
      while ((frame = this.postincrement())) {
        this._frame = frame;
        this.plugin(Pubsub).publish(FRAME_BEFORE, frame);
        try {
          const action = (this._action = await this.plugin(ActionLookup).get(
            frame
          ));
          await this.runAction(action);
          this.plugin(Pubsub).publish(FRAME_AFTER, frame);
        } catch (e) {
          this.plugin(Pubsub).publish(FRAME_MISSING, frame);
          this.pop();
        }
      }
    } finally {
      this.plugin(Pubsub).publish(ENGINE_AFTER, this);
    }
  }

  private setStart(start: undefined | null | Key | Path) {
    if (Array.isArray(start)) {
      this.pushAbsolute(start as Path);
    }
    start ??= "start";
    this.pushAbsolute([start as Key]);
  }
  // If the path ends in a number, take the next value. Otherwise, pop the path off.
  // We will visit "off the end" numbers (so a scene with 4 actions will get visited with action #5).
  // However, the effect of visiting a null scene is _also_ to pop the frame.
  private postincrement(): Path | undefined {
    const path = this._frames.pop();
    if (path) {
      const next = [...path];
      const i = next.pop();
      if (Number.isFinite(i)) {
        next.push((i as number) + 1);
        this._frames.push(next);
      }
    }
    return path;
  }

  private _batcher = new Batcher();
  // Exposed so that clients can tell the executor they're
  // still executing.
  continue(action: Action) {
    this.plugin(Pubsub).publish(ACTION_CONTINUING, action);
    return this._batcher.push(() =>
      this.plugin(Pubsub).publish(ACTION_RESOLVING, action)
    );
  }

  private async runAction(action: Action) {
    const pubsub = this.plugin(Pubsub);
    try {
      pubsub.publish(ACTION_BEFORE, action);
      await action.run(this);
    } catch (error) {
      pubsub.publish(ERRORS_ACTION_RUN, { action, error });
      // But otherwise suppressed.
    } finally {
      pubsub.publish(ACTION_AFTER, action);
      this._batcher.finally(() => pubsub.publish(ACTION_FINALLY, action));
    }
  }

  get pubsub() {
    return this.plugin(Pubsub);
  }
  get eval() {
    return this.plugin(Evaluator);
  }
}

const ENGINE_BEFORE = arr`engine before`;
const ENGINE_AFTER = arr`engine after`;
const STACK_PUSHED = arr`stack pushed debug`;
const STACK_POPPED = arr`stack popped debug`;
const FRAME_BEFORE = arr`frame before debug`;
const FRAME_AFTER = arr`frame after debug`;
const FRAME_MISSING = arr`frame missing debug`;
const ACTION_BEFORE = arr`action before`;
const ACTION_AFTER = arr`action after`;
const ACTION_CONTINUING = arr`action continuing debug`;
const ACTION_RESOLVING = arr`action resolving debug`;
const ACTION_FINALLY = arr`action finally debug`;
const ERRORS_ACTION_RUN = arr`action run error`;
