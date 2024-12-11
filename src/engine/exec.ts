import Stack from "@/src/util/stack";
import plugin from "./plugins";
import { arr, last } from "../util/objectPath";
import loader from "./loader";
import { Beat, typeBeats } from "./beats";
import { channel } from "../util/promises";
import Signal from "../util/signal";
import unwrap from "../util/lazy";

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
export class Exec {
  #waitingForUser = false;
  #waitingForSystem = 0;
  #waitingChannel = channel();

  #stack = new Stack<Path>();
  #here = [] as Path;
  #count = 0;

  onEngine = new Signal<["before" | "after", Exec]>("engine").bridgeTo(
    Signal.INFO
  );
  beforeFrame = new Signal<[Path]>("beforeFrame").bridgeTo(Signal.DEBUG);
  beforeBeat = new Signal<[Beat]>("beforeBeat").bridgeTo(Signal.DEBUG);
  onFrameWeird = new Signal<
    ["missing" | "skipped" | "pushed" | "popped" | "done", undefined | Path]
  >("frameEvent").bridgeTo(Signal.DEBUG);
  afterFrame = new Signal<[Path]>("afterFrame").bridgeTo(Signal.INFO);

  get here(): Path {
    return this.#here;
  }
  get count(): number {
    return this.#count;
  }

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

  import(src: any) {
    const exec = src.exec;
    if (!exec) return;
    const { stack, here, waitingForUser } = exec;
    while (!this.#stack.isEmpty) {
      this.pop();
    }
    for (let frame of stack ?? []) {
      this.pushAbsolute(frame as Path);
    }
    this.#here = here ?? [];
    this.#waitingForUser = !!waitingForUser;
    // We can't modify waitingForSystem -- it's pretty likely that other plugins will themselves wait for system.
  }

  export(): object {
    return {
      exec: {
        stack: this.#stack.values,
        here: this.#here,
        waitingForUser: !!this.#waitingForUser,
      },
    };
  }

  pushNext(n?: number, from = this.#here): void {
    if ("number" !== typeof last(from)) return;
    let next = [...from];
    n ??= (next[next.length - 1] as number) + 1;
    next[next.length - 1] = n;
    this.pushAbsolute(next);
  }

  pushChild(key: Key, from = this.#here): Path {
    return this.pushAbsolute([...from, key]);
  }

  pushNamed(key: Key): Path {
    const module = this.here[0];
    return this.pushAbsolute([module, key, 0]);
  }

  pushAbsolute(path: Path): Path {
    this.#stack.push(path);
    this.onFrameWeird.notify("pushed", path);
    return path;
  }
  push(...keys: string[]): Path {
    switch (keys.length) {
      case 0:
        return this.pushNamed("default");
      case 1:
        return this.pushNamed(keys[0]);
      default:
        return this.pushAbsolute(keys);
    }
  }

  pop(): undefined | Path {
    const path = this.#stack.pop();
    this.onFrameWeird.notify("popped", path);
    return path;
  }

  async run(start?: undefined | null | Key | Path): Promise<void> {
    this.setStart(start);
    try {
      this.onEngine.notify("before", this);
      let frame;
      while ((frame = this.pop())) {
        this.#here = frame;
        this.beforeFrame.notify(frame);
        try {
          let beat = await loader.load(frame);
          this.doBeat(beat);
          while (this.#waitingForUser || this.#waitingForSystem) {
            await this.#waitingChannel[0]();
          }
        } catch (e) {
          console.error(this, "Frame error", e);
        } finally {
          this.afterFrame.notify(frame);
        }
      }
    } finally {
      this.onEngine.notify("after", this);
    }
  }

  private async doBeat(beat?: Beat) {
    const parent = loader.peekAt(-1);
    if (!beat) {
      if (typeBeats(parent) && "function" === typeof parent.afterAll) {
        parent.afterAll();
      }
      this.onFrameWeird.notify("missing", this.#here);
      return;
    }
    // Restore the next frame, since there's something here to try.
    this.pushNext();
    this.#count++;
    if (!(unwrap.guard(beat.if) ?? true)) {
      this.onFrameWeird.notify("skipped", this.#here);
      return;
    }
    if (typeBeats(parent) && "function" === typeof parent.beforeEach) {
      console.log(
        "Executing beforeEach",
        this.#here,
        beat,
        "on its parent",
        parent
      );
      parent.beforeEach();
    }
    this.beforeBeat.notify(beat);
    beat.do();
  }

  private setStart(start: undefined | null | Key | Path) {
    start ??= arr`start default ${0}` as Path;
    if (!Array.isArray(start)) {
      start = [start as Key, "default", 0] as Path;
    }
    if ("number" !== typeof last(start)) {
      start = [...start, 0] as Path;
    }
    this.pushAbsolute(start);
  }
}
export default plugin.add(new Exec());
