import Stack from "@/src/util/stack";
import { Key, Path } from "@/src/util/jpath";
import Action from "@/src/engine/action";
import { Batcher } from "@/src/util/promises";
import {
  PluginSource,
  Plugin,
  Pubsub,
  PluginClass,
  ActionLookup,
} from "./plugin";
import Rand from "../vn/rand";

type Frame = Path;
export type Vars = { [k: string]: any };
// Holds the executor in the Vars space so actions can refer to it.
export type Dollar = { [k: string]: any };
export interface CoreProps {
  start?: undefined | Key | Path;
  vars?: undefined | Record<string, any>;
  plugins?:
    | undefined
    | [
        PluginSource<Pubsub>,
        PluginSource<ActionLookup>,
        PluginSource<Rand>,
        ...PluginSource[]
      ];
}
export type Props<T = any> = CoreProps & Partial<T>;

export default class Executor {
  public readonly props: Readonly<Props>;
  private _vars: Vars = {};
  private readonly _plugins = new Map<PluginClass, Plugin>();
  private readonly _pluginInstances: Plugin[] = [];
  private readonly _frames = new Stack<Frame>();
  private _frame: Frame = [];

  // Technically a lie!
  // Usually when you do this, you'll be looking at the next call.
  get peek() {
    return this._frame;
  }
  get next() {
    return this._frames.peek;
  }
  get vars() {
    return this._vars;
  }
  constructor(props: Props) {
    this.props = props;
    this._vars = { ...props.vars };
    this.vars.$ = this;
    // We have to initialize plugins first -- even the pubsub tool is a plugin!
    for (let pluginSource of props?.plugins ?? []) {
      const instance: Plugin =
        typeof pluginSource == "function"
          ? new pluginSource(this)
          : pluginSource;
      this._pluginInstances.push(instance);
      let proto = instance;
      let ctor = null;
      while (proto && (ctor = proto.constructor)) {
        console.log(
          "Registering from",
          pluginSource,
          "instance",
          instance,
          "to",
          ctor
        );
        this._plugins.set(ctor, instance);
        proto = Object.getPrototypeOf(proto);
      }
    }
    if (props.start) {
      if (Array.isArray(props.start)) {
        this.pushAbsolute(props.start as Path);
      } else {
        this.pushAbsolute([props.start as Key]);
      }
    }
  }

  import(vars: any) {
    while (!this._frames.isEmpty) {
      this.pop();
    }
    // This is the hard one -- we don't allow anyone to reset vars...
    const $ = (vars as any).$;
    delete vars.$;
    this._vars = vars;
    this._vars.$ = this;

    for (let frame of $.stack) {
      this.pushAbsolute(frame as Path);
    }
    this._frame = $.frame;
    const imported = new Set();
    for (let plugin of this._plugins.values()) {
      if (imported.has(plugin)) continue;
      imported.add(plugin);
      plugin.import($);
    }
  }

  async export(cb: (vars: any) => PromiseLike<void>): Promise<void> {
    try {
      const $ = { stack: this._frames.values, frame: this._frame };
      const exported = new Set();
      for (let plugin of this._plugins.values()) {
        if (exported.has(plugin)) continue;
        exported.add(plugin);
        plugin.export(this._vars.$);
      }
      this._vars.$ = $;
      await cb(this._vars);
    } finally {
      this._vars.$ = this;
    }
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

  pushRelative(partial: Path): Path {
    return this.pushAbsolute([...this.peek!, ...partial]);
  }

  pushAbsolute(path: Path): Path {
    this._frames.push(path);
    this.plugin(Pubsub).publish(`stack.pushed`, path);
    return path;
  }

  pop(): undefined | Path {
    const path = this._frames.pop();
    this.plugin(Pubsub).publish(`stack.popped`, path);
    return path;
  }

  private _action: undefined | Action;
  get action() {
    return this._action!;
  }

  async run(): Promise<void> {
    try {
      this.plugin(Pubsub).publish("engine.before", this);
      let frame;
      while ((frame = this.postincrement())) {
        this._frame = frame;
        this.plugin(Pubsub).publish("frame.before", frame);
        try {
          const action = (this._action = await this.plugin(ActionLookup).get(
            frame
          ));
          await this.runAction(action);
          this.plugin(Pubsub).publish("frame.after", frame);
        } catch (e) {
          this.plugin(Pubsub).publish("frame.missing", frame);
          this.pop();
        }
      }
    } finally {
      this.plugin(Pubsub).publish("engine.after", this);
    }
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
    this.plugin(Pubsub).publish("action.continuing", action);
    return this._batcher.push(() =>
      this.plugin(Pubsub).publish("action.resolving", action)
    );
  }

  private async runAction(action: Action) {
    const pubsub = this.plugin(Pubsub);
    try {
      pubsub.publish("action.before", action);
      await action.run(this);
    } catch (error) {
      pubsub.publish("errors.action.run", { action, error });
      // But otherwise suppressed.
    } finally {
      pubsub.publish("action.after", action);
      this._batcher.finally(() => pubsub.publish("action.finally", action));
    }
  }
}
