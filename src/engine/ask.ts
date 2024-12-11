import unwrap, { Source } from "../util/lazy";
import Signal from "../util/signal";
import { Beat, Beats, of } from "./beats";
import exec from "./exec";
import plugin, { Plugin } from "./plugins";

export type Asked = string[];
export class Ask implements Plugin {
  #asked = [] as Asked;
  #answered?: number;

  readonly onAsk = new Signal<[Asked]>("ask").bridgeTo(Signal.INFO);
  readonly onAnswer = new Signal<[number]>("answer").bridgeTo(Signal.INFO);

  import(source: any): void {
    this.#asked = source.ask?.asked;
    this.#answered = source.ask?.answered ?? undefined;
  }
  export(): undefined | object {
    return {
      ask: {
        asked: this.#asked,
        ...(this.#answered && { answered: this.#answered }),
      },
    };
  }
  get asked() {
    return this.#asked;
  }
  get answer() {
    return this.#answered;
  }
  ask(asks: OptionBeat[]) {
    if (this.#asked.length <= 0) {
      this.#asked = asks.map((beat) =>
        unwrap.guard(beat.if) ?? true ? unwrap(beat.label) : ""
      );
      this.#answered = undefined;
    }
    if (this.#asked.length > 0) {
      this.onAsk.notify(this.#asked);
      exec.trapUser();
      // Don't continue to our siblings! Repeat this node until someone successfully answers.
      exec.pop();
      exec.pushAbsolute(exec.here);
    }
  }
  clearAsk() {
    console.log("Entering child", exec.here, "of ask; cleaning up!");
    this.#asked = [];
    this.#answered = undefined;
    // In particular, the stack state is now something like:
    // SomeScene -> Base -> SomeAsk -> SomeOpt
    // SomeScene -> Base -> SomeAsk + 1
    // SomeScene -> Base + 1
    // We do _not_ want to continue to SomeOpt + 1!
    // So: pop that out.
    exec.pop();
  }

  setAnswer(c: undefined | number) {
    if ("number" !== typeof c) {
      return;
    }
    this.#answered = c;
    this.onAnswer.notify(c);
    console.log("Trying to setAnswer", c, "from", exec, "at", exec.here);
    // Set the selected child -- JUST the child, since we'll clearAsk before the child actually executes.
    // But mark userReady so we can proceed!
    exec.pushChild(c);
    exec.userReady();
  }
}

const askPlugin = plugin.add(new Ask());

export interface OptionBeat extends Beat {
  label: Source<string>;
}
export interface AskBeat extends Beats {}
export default function ask(...children: OptionBeat[]): AskBeat {
  return {
    children,
    do() {
      // Ensure we show the user the questions from here.
      askPlugin.ask(children);
      // We _don't_ push a specific child.
      // Instead, once the user answers, we'll push the child then.
    },
    beforeEach() {
      // We only move on to children once we've externally kicked them off, so clean up now.
      askPlugin.clearAsk();
    },
  };
}
type AskObject = Source<Record<string, undefined | Beat | Beat[]>>;
ask.object = function askObject(source: AskObject): AskBeat {
  let primitives = Object.entries(unwrap(source));
  let opts: OptionBeat[] = primitives
    .map(([k, v]) => {
      if (k === "") return undefined;
      if (!v) {
        return undefined;
      } else if (Array.isArray(v)) {
        return { label: k, ...of.all(...v) };
      } else {
        return { label: k, ...v };
      }
    })
    .filter((i) => !!i);
  return ask(...opts);
};

ask.plugin = askPlugin;
