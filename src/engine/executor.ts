import Stack from "@/src/util/stack";
import Pubsub from "@/src/util/pubsub";
import { Key, Path } from "@/src/util/jpath";
import Action, { Lookup } from "./action";
import { accumulate } from "@/src/util/promises";

type Vars = { [k: string]: any };

export interface Props {
  lookup: Record<Key, Action>;
  vars?: undefined | Record<string, any>;
}

type Frame = Path;

export type ThrowT = "break" | "jump";

export default class Executor implements Lookup<Action> {
  readonly pubsub = new Pubsub();
  private _vars: Vars = {};
  private readonly frames = new Stack<Frame>();
  private readonly throws = new Stack<ThrowT>();

  private _postincrement = true;

  get peek() {
    return this.frames.peek;
  }

  get catching() {
    return this.throws.peek!;
  }

  get vars() {
    return this._vars;
  }
  private _lookup: Record<Key, Action> = {};
  get lookup() {
    return this._lookup;
  }

  constructor(props: Props) {
    this._lookup = { ...props.lookup };
    this._vars = { ...props.vars };
    this.vars.$ = this;
  }

  reset(vars: any) {
    while (!this.frames.isEmpty) {
      this.pop();
    }
    const stack: object[] = (vars as any).$.stack;
    delete vars.$;
    // This is the hard one -- we don't allow anyone to reset vars...
    this._vars = vars;
    this._vars.$ = this;
    for (let frame of stack) {
      this.pushAbsolute(frame as Path);
    }
  }

  async export(cb: (vars: any) => void): Promise<void> {
    try {
      this._vars.$ = {
        stack: this.frames.values,
      };
      await cb(this._vars);
    } finally {
      this._vars.$ = this;
    }
  }

  addAction(name: Key, action: Action) {
    let had;
    if ((had = this._lookup[name])) {
      console.error("Already had", name, had, "so can't add", action);
      throw new Error();
    }
    this._lookup[name] = action;
  }

  pushRelative(partial: Path): Path {
    return this.pushAbsolute([...this.peek!, ...partial]);
  }

  pushAbsolute(path: Path): Path {
    this._postincrement = false;
    const action = this.getAction(path);
    action?.beforePush(this);
    this.frames.push(path);
    action?.afterPush(this);
    this.pubsub.publish(`stack.pushed`, path);
    return path;
  }

  pop(): undefined | Path {
    const path = this.frames.pop();
    const action = path ? this.getAction(path) : undefined;
    action?.afterPop(this);
    this.pubsub.publish(`stack.popped`, path);
    return path;
  }

  throw(e: ThrowT): void {
    try {
      this.throws.push(e);
      this.pubsub.publish("throws.start", e);
      let frame: Path | undefined;
      // This is slightly wrong!
      // Because we postincrement the fptr, this is the next element on the same scene.
      // This likely hasn't been started yet. But if during teardown we throw again (!!!),
      // then the first element **is** actually started.
      // The bug I can imagine is a (conditional?) jump right before a loop.
      // The loop handles breaks but the jump wants to drill to the current scene.
      while ((frame = this.frames.peek)) {
        const action = this.getAction(frame);
        if (!action) continue;
        this.pubsub.publish("throws.try", action);
        if (action.catch(this)) {
          this.pubsub.publish("throws.caught", action);
          break;
        }
        this.pop();
      }
    } finally {
      this.throws.pop();
      this.pubsub.publish("throws.end", e);
    }
  }

  getAction(path: Path): undefined | Action {
    return Action.getPath(this, path);
  }
  // To comply with Lookup<Action>...
  get(key: Key): undefined | Action {
    return this._lookup[key];
  }

  async run(start: Path = ["start"]): Promise<void> {
    try {
      this.pushAbsolute(start);
      this.pubsub.publish("engine.before", this);
      let frame;
      while ((frame = this.peek)) {
        this._postincrement = true;
        this.pubsub.publish("frame.before", frame);
        const action = this.getAction(frame);
        if (!action) {
          this.pubsub.publish("frame.missing", frame);
          this.pop();
          continue;
        }
        await this.runAction(action);
        this.pubsub.publish("frame.after", frame);
        this.postincrement();
      }
    } finally {
      this.pubsub.publish("engine.after", this);
    }
  }

  private postincrement(): Path | undefined {
    if (!this._postincrement) {
      return;
    }
    const path = this.frames.peek;
    if (path) {
      this.frames.pop();
      const next = [...path];
      const i = next.pop();
      if (Number.isFinite(i)) {
        next.push((i as number) + 1);
        this.frames.push(next);
      }
    }
    return path;
  }

  private _continue: () => () => void = () => {
    throw new Error();
  };
  get continue() {
    return this._continue;
  }

  private async runAction(action: Action) {
    const allContinues: Promise<void>[] = [];
    this._continue = accumulate(allContinues, () => {
      this.pubsub.publish("action.continuing", action);
    });
    try {
      this.pubsub.publish("action.before", action);
      await action.run(this);
    } catch (error) {
      this.pubsub.publish("errors.action.run", { action, error });
      // Suppress it,
    } finally {
      this.pubsub.publish("action.after", action);
      Promise.all(allContinues).finally(() => {
        this.pubsub.publish("action.finally", action);
      });
    }
  }
}
