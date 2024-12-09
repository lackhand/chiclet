import unwrap, { Source } from "../util/lazy";
import exec, { Path } from "./exec";

/**
 * Utilities for each unit of execution in the `exec`.
 *
 *
 *
 *
 */

export interface Beat {
  do(): void;
  if?(): boolean;
}
export function typeBeat(a: any): a is Beat {
  return (
    "object" === typeof a &&
    ((a = a["do"]), "function" === typeof a && a.length === 0)
  );
}
export interface Beats extends Beat {
  get(key: number): Beat;
  beforeEach?(): void;
  afterAll?(): void;
}
export function typeBeats(a: any): a is Beats {
  return (
    typeBeat(a) &&
    ((a = (a as Beats).get), "function" === typeof a && a.length === 1)
  );
}
export function of(action: () => void, _if?: () => boolean): Beat {
  return Object.assign({ do: action }, _if && { if: _if });
}
/// Covenience to execute multiple statements in order (standard flow of control).
/// Should be exactly equivalent to using an array.
export function all(...beats: Beat[]): Beats {
  return {
    get(key: number) {
      return beats[key];
    },
    do() {
      exec.pushChild(0);
    },
  };
}
export function scene(name: string, ...beats: Beat[]): Beats {
  return {
    get(key: number) {
      return beats[key];
    },
    do() {
      console.log("starting scene", name);
      exec.pushChild(0);
    },
    afterAll() {
      console.log("ending scene", name);
    },
  };
}
all.of = function allOf(source: () => Iterable<Beat>): Beats {
  let beats: undefined | Beat[];
  return {
    get(key: number) {
      return beats![key];
    },
    do() {
      beats = Array.from(source());
      exec.pushChild(0);
    },
  };
};
/// Convenience to execute the first beat which is non-null,
export function when(...beats: Beat[]): Beats {
  return {
    get(key: number) {
      return beats[key];
    },
    do() {
      exec.pushChild(0);
    },
    beforeEach() {
      // This is called before each child, after any `if` conditional
      // Soooo... We shouldn't continue!
      exec.pop();
    },
  };
}
// A 'while' loop. Resident on the stack. When it executes, it reinserts itself
function genericLoop(
  isDo: boolean,
  guard: Source<boolean>,
  ...beats: Beat[]
): Beats & Beat {
  if (beats.length <= 0) {
    return all();
  }
  return {
    get(key: number) {
      return beats[key];
    },
    do() {
      exec.pushChild(isDo ? 0 : Number.MAX_SAFE_INTEGER);
    },
    afterAll() {
      if (unwrap(guard) ?? true) {
        exec.pushNext(0);
      }
    },
  };
}
export function loop(guard: Source<boolean>, ...beats: Beat[]): Beats & Beat {
  return genericLoop(false, guard, ...beats);
}
loop.do = function loopDo(
  guard: Source<boolean>,
  ...beats: Beat[]
): Beats & Beat {
  return genericLoop(true, guard, ...beats);
};
loop.break = function loopBreak(count = 1): Beat {
  return {
    do() {
      for (let i = 0; i < count; ++i) {
        exec.pop();
      }
    },
  };
};
loop.continue = function loopContinue(count = 1): Beat {
  return {
    do() {
      let stacks: Path[] = [];
      for (let i = 1; i < count; ++i) {
        stacks.push(exec.pop()!); // Remove the indicated loop(s) (less one!).
      }
      // And then finally for the final popped loop, insert it anew.
      let newFrame = [...exec.pop()!];
      newFrame[newFrame.length - 1] = 0;
      exec.pushAbsolute(newFrame);
    },
  };
};
