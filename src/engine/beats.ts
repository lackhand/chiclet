import unwrap, { Source } from "../util/lazy";
import exec from "./exec";

export interface Beat {
  // Called when the node is visited onPush (when exec isn't popping).
  do(): void;
}
export interface ConditionalBeat extends Beat {
  // A conditional beat _without_ an `if` is just trivially true.
  // We'll execute any `do` when the conditional is true (`unwrap(if) ?? true`).
  if?: Source<boolean>;
}
export interface LabeledBeat extends Beat {
  label: Source<string>;
}
export function typeBeat(a: any): a is Beat {
  return (
    "object" === typeof a &&
    ((a = a["do"]), "function" === typeof a && a.length === 0)
  );
}
export interface Beats extends Beat {
  children?: Beat[];
  // Overrides the default behavior of returnfrom.
  next?: Source<boolean>;
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
export interface SceneBeat extends Beats {
  // Called at the loader layer when this scene is first loaded.
  onLoad?(): void;
}

type Prohibit<T, K extends keyof T> = { [P in K]?: never } & {
  [P in keyof T]: T[P];
};
type SceneBeatPreconfig = Prohibit<Partial<SceneBeat>, "do" | "children">;

export function scene(
  prefix: SceneBeatPreconfig,
  ...children: Beat[]
): SceneBeat {
  return {
    ...prefix,
    children,
    do() {
      exec.pushChild(0);
    },
  };
}

/// Convenience to execute the first beat, and then skip the rest.
/// using Conditional beats or whatever, this can sometimes be meaningful!
export function first(...children: Beat[]): Beats {
  return {
    children,
    do() {
      exec.pushChild(0);
    },
    continueAfterFirst: false,
  };
}

/// While loop -- checks the guard, then executes. Forever.
export function loop(guard: Source<boolean>, ...beats: Beat[]): Beats & Beat {
  return genericLoop(false, guard, ...beats);
}
/// Do/While style loop -- one free execute, then check the condition.
loop.do = function loopDo(
  guard: Source<boolean>,
  ...beats: Beat[]
): Beats & Beat {
  return genericLoop(true, guard, ...beats);
};
loop.continue = function loopContinue() {
  return {
    do() {
      exec.continue();
    },
  };
};
loop.break = function loopBreak() {
  return {
    do() {
      exec.break();
    },
  };
};

// A 'while' loop. Resident on the stack. When it executes, it reinserts itself
function genericLoop(
  isDo: boolean,
  guard: Source<boolean>,
  ...beats: Beat[]
): Beats & LabeledBeat {
  const children = [
    ...beats,
    {
      do() {
        if (unwrap(guard) ?? true) exec.pushNext(0);
      },
    },
  ];
  return {
    children,
    label: "",
    do() {
      exec.pushChild(isDo ? 0 : children.length - 1);
    },
  };
}
