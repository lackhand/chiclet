import plugin from "./plugins";
import loader from "./loader";
import {
  Beat,
  Beats,
  ConditionalBeat,
  LabeledBeat,
  SceneBeat,
  typeBeats,
} from "./beats";
import { channel } from "../util/promises";
import Signal from "../util/signal";
import unwrap from "../util/lazy";
import { err } from "../util/tags";
import { Knapsack } from "./knapsack";

export type Key = number | string;
export type Path<K = Key> = ReadonlyArray<K>;

/**
 * An observer of "beats".
 *
 * A "beat" is logically a `(): void` closure (it's actually implemented as `interface { do(): void }` but: same idea).
 * It maintains its current operating state in a "stack" of next pointers -- the tip is the next one which will be executed.
 * The currently executing one is identified by `here`.
 * Importantly, lots of beats are themselves containers of beats (for instance: scenes, or beats where we wait for a response from the user, or conditional forks etc).
 * They support this with `interface {get(number): undefined|Beat}` (the first undefined number ends the element; see Beats for more).
 * As a result, these pointers are actually "paths" -- arrays whose prefices are string identifiers that should be loaded
 * (modules, and then properties within those modules identifying externally visible scene and branch information)
 * and whose suffices are integers (array offsets within those branches to the relevant beat).
 *
 * This is serializable between beats (, assuming all other variable state is serializable)!
 * Save the stack, the here ptr, and whether the exec is blocked (I think it will always be blocked? I guess it depends on our impl!s).
 * On restore, resume from that state without executing anything (or if !blocked, continue to next instruction).
 * Tada!
 *
 * Beats' closures can interact with the exec engine itself to modify control, in addition to emitting their own side effects.
 * These side effects are usually:
 * - changes to actor state & dialog lines. The `actor` beat factory is helpful here, creating an appropriate safely thunk'd beat.
 * - questions to the player. See `ask`.
 * - Control flow statements, which interact directly with exec (though see beats for slightly higher level primitives).
 */
const cachedScene = Symbol("UnserializedSymbol");
export interface Frame {
  module: string;
  name: string;
  [cachedScene]?: SceneBeat;

  // The beat which is currently executing within the scene (if any).
  // We rely on the pop logic to find next (ie, "here" is the old value).
  // So scenes that want to poke holes in the "next" logic need to modify "here" before they leave.
  here: Path<number>;

  // Local state we can scratch into.
  local: Record<string, any>;
}
export class Exec {
  #waitingForUser = false;
  #waitingForSystem = 0;
  #waitingChannel = channel();
  #count = 0;

  get count(): number {
    return this.#count;
  }
  get local() {
    return this.#frame.local;
  }

  #frames = [] as Frame[];
  onEngine = new Signal<["before" | "after", Exec]>("engine").bridgeTo(
    Signal.INFO
  );
  onScene = new Signal<["push" | "pop", Frame]>("frame").bridgeTo(Signal.DEBUG);

  beforeBeat = new Signal<[Beat, Path]>("beforeBeat").bridgeTo(Signal.DEBUG);
  onBeatWeird = new Signal<["missing" | "skipped", undefined | Path]>(
    "beatEvent"
  ).bridgeTo(Signal.DEBUG);
  afterBeat = new Signal<[Beat, Path]>("afterBeat").bridgeTo(Signal.INFO);

  /// The engine promises it will wait for user input before proceeding to the next step.
  trapUser() {
    this.#waitingForUser = true;
  }
  trapSystem() {
    this.#waitingForSystem++;
  }
  userReady() {
    this.#waitingForUser = false;
    this.#waitingChannel[1]();
  }
  systemReady() {
    --this.#waitingForSystem;
    this.#waitingChannel[1]();
  }

  get #frame() {
    return this.#frames.at(-1)!;
  }
  get scene(): SceneBeat {
    const frame = this.#frame;
    return frame[cachedScene] ?? err`Hadn't preloaded ${JSON.stringify(frame)}`;
  }
  get here(): Path<number> {
    return this.#frame.here;
  }
  popScene() {
    this.onScene.notify("pop", this.#frame);
    this.#frames.pop();
  }
  pushScene(name: string, module?: string, defaults?: Partial<Frame>): Frame {
    module ??= this.#frame?.module ?? "default";
    this.#frames.push({
      here: [],
      local: {},
      ...defaults,
      module,
      name,
    });
    this.onScene.notify("push", this.#frame);
    return this.#frame;
  }
  replaceScene(name: string, module?: string, forgetAll = false) {
    do {
      this.popScene();
    } while (forgetAll && this.#frames.length);
    return this.pushScene(name, module);
  }

  async import(src: any) {
    const exec = src.exec;
    if (!exec) return;
    const { frames = [] as Frame[], waitingForUser } = exec;
    while (this.#frames.length) {
      this.popScene();
    }
    this.#waitingForUser = !!waitingForUser;
    // During import, we have to do all the scene caching now since that which is on the stack won't get visited again and we have to call pushScene.
    this.trapSystem();
    const promises = [] as Promise<any>[];
    for (let frame of frames as Frame[]) {
      promises.push(
        this.#loadSceneIntoFrame(
          this.pushScene(frame.name, frame.module, frame)
        )
      );
    }
    await Promise.allSettled(promises);
    this.systemReady();
    // We can't modify waitingForSystem -- it's pretty likely that other plugins will themselves wait for system.
  }

  async #loadSceneIntoFrame(frame: Frame): Promise<Frame> {
    if (frame[cachedScene]) return frame;
    frame[cachedScene] = await loader.scene(frame.name, frame.module);
    return frame;
  }

  export(): object {
    const waiting = this.#waitingForSystem;
    if (waiting) {
      console.warn(
        `${
          this.#waitingForSystem
        } waiting for system, saving is going to be weird.`
      );
    }
    return {
      exec: {
        frames: this.#frames,
        waitingForUser: !!this.#waitingForUser,
      },
    };
  }

  // Replaces this node with its own sibling (which mightn't exist!)
  pushNext(n?: number) {
    const next = [...this.#frame.here];
    next[next.length - 1] = n ?? (next.at(-1) ?? -1) + 1;
    this.#frame.here = next;
  }

  // Pushes a child to the current node (which had better have such a child!).
  pushChild(n: number) {
    this.#frame.here = [...this.#frame.here, n];
  }
  popChild() {
    const next = [...this.#frame.here];
    const child = next.pop();
    this.#frame.here = next;
    return child;
  }

  // adds the current scene and runs from there.
  async runFrom(scene?: string | [string] | [string, string]): Promise<void> {
    if (Array.isArray(scene)) {
      this.pushScene(scene[0], scene[1]);
    } else {
      this.pushScene(scene ?? "default");
    }
    return this.run();
  }

  async run(): Promise<void> {
    try {
      this.onEngine.notify("before", this);
      let frame: Frame;
      while ((frame = this.#frame)) {
        do {
          try {
            await this.#visitFrame(frame);
            while (this.#waitingForUser || this.#waitingForSystem) {
              await this.#waitingChannel[0]();
            }
          } catch (e) {
            console.error(this, "Suppressing frame error", e);
          } finally {
            this.#nextFrame();
          }
        } while (frame.here.length);
      }
    } finally {
      this.onEngine.notify("after", this);
    }
  }

  #beatKnapsack = new Knapsack<Beat, number>(
    (beat, index, pathi, totalPath) =>
      (beat as Beats).children?.[index] ??
      err`Missing beat at ${pathi} of ${totalPath.join(".")}`
  );
  get beatStack() {
    return this.#beatKnapsack.calculate(this.scene, this.here);
  }

  async #visitFrame(frame: Frame) {
    frame = await this.#loadSceneIntoFrame(frame);
    let here = frame.here;
    // The set of beats represented by the path above.
    const beat = this.#beatKnapsack
      .calculate(
        frame[cachedScene] ?? err`Missing scene at ${JSON.stringify(frame)}`,
        frame.here
      )
      .at(-1);
    if (!beat) {
      // This isn't _that_ weird. It 99% means that we "nexted" outside of a parent.
      this.onBeatWeird.notify("missing", here);
      return;
    }
    if (unwrap.or((beat as ConditionalBeat).if) ?? true) {
      // A true conditional beat, or just no guard condition. Continue!
    } else {
      this.onBeatWeird.notify("skipped", here);
      return;
    }
    // We're doing it! taking a turn!
    this.#count++;
    try {
      this.beforeBeat.notify(beat, here);
      beat.do();
    } finally {
      this.afterBeat.notify(beat, here);
    }
  }
  #nextFrame() {
    // Consider a normal "run all in list" -- then the next frame for each is just the next value.
    // What if it's a `first` (run only the first one whose `if` is true)?
    // Then the next frame for any child is actually exit.
    // What if it's a loop? Usually it's like a list, but for the special last element it's (conditionally) goto 0.
    // And what if they nest, s.t. it's a `list(someNodeA, loop(first(someNodeB)), someNodeC)`, each of which has opinions about the children?
    // It's clear that someNodeB doesn't have special next-y behavior, but the `first` does for its children and the loop ditto.
    // (the "list" has very slightly special behavior :-D ).
    // The good news is that we can tell the difference between nodes we reach onPush and nodes we reach onPop.
    while (this.#frames.length) {
      const frame = this.#frame;
      // The call did nothing to the stack.
      // As a result, it's done -- and perhaps, so are its friends and relatives!
      let next = [...frame.here];
      // *really* should be identical...
      this.#beatKnapsack.calculate(frame[cachedScene]!, next);
      while (true) {
        const popped = this.#beatKnapsack.pop();
        frame.next.pop();
        if (!popped) break;
        // Discard the beat value -- it can't hurt us anymore. Consider the parent together with the child.
        const [n, _b] = popped;
        let b = this.#beatKnapsack.values.at(-1);
        if (!typeBeats(b)) continue; // It can't have children, so we don't need to concern ourselves here.
        if (unwrap.or(b.continue) ?? true) {
          // We've found a "next" candidate! On to the next state machine step.
          frame.next.push(n + 1);
          return;
        }
      }
      // Ok. To reach here, we emptied out the knapsack. That means we're done with the parent scene.
      // Which means we now might need to start tearing down the scene stack, too.
      this.popScene();
    }
  }

  #popToLabel(wantLabel = "") {
    const beats = this.beatStack;
    const stack = [...this.#frame.here];
    for (
      let beat = beats.pop();
      unwrap.or((beat as LabeledBeat).label) != wantLabel;
      beat = beats.pop()
    ) {
      stack.pop();
    }
    return stack;
  }
  continue() {
    const atLabel = this.#popToLabel();
    // Now we need to voop to the end of the
  }
  break() {
    // "continue from this node to its sibling"
    this.#frame.here = this.#popToLabel();
  }
}
export default plugin.add(new Exec());
