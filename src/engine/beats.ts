import unwrap, { Source } from "../util/lazy";
import exec, { Path } from "./exec";

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
  // If `children`, then we can do fancy stuff like `get`.
  children?: Beat[];
  // This is really only used in the `when` construct to run the first successful child.
  beforeEach?(): void;
  // This could have been used to run a loop.
  // But it isn't; we insert a synthetic last element for the loop and zip to the end of the list.
  afterAll?(): void;
}
export function typeBeats(a: any): a is Beats {
  return typeBeat(a) && Array.isArray((a as Beats).children);
}
export function of(action: () => void, _if?: () => boolean): Beat {
  return Object.assign({ do: action }, _if && { if: _if });
}
of.all = function ofAll(...children: Beat[]): Beats {
  return {
    children,
    do() {
      exec.pushChild(0);
    },
  };
};
of.unwrap = function ofUnwrap(src: Source<Beat | Beat[]>): Beat {
  let concrete = unwrap(src);
  if (Array.isArray(concrete)) {
    return of.all(...concrete);
  }
  return concrete;
};
interface SceneBeat extends Beats {
  name: string;
  preload?(): void;
}
interface SceneBeatPreconfig extends Partial<SceneBeat> {
  do?: never;
  children?: never;
}
export function scene(prefix: SceneBeatPreconfig, ...children: Beat[]): Beats {
  return {
    ...prefix,
    children,
    do() {
      console.log("starting scene", name);
      exec.pushChild(0);
    },
    afterAll() {
      console.log("ending scene", name);
    },
  };
}

/// Convenience to execute the first beat which is non-null,
export function when(...children: Beat[]): Beats {
  return {
    children,
    do() {
      exec.pushChild(0);
    },
    beforeEach() {
      // This is called before each child, **after** any `if` conditional
      // Soooo... We shouldn't continue with that child's sibling!
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
    return of.all();
  }
  const children = [
    ...beats,
    {
      do() {
        if (false === unwrap(guard)) return;
        exec.pop();
        exec.pushNext(0);
      },
    },
  ];
  return {
    children,
    do() {
      exec.pushChild(isDo ? 0 : children.length - 1);
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
