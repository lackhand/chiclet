import unwrap, { Source } from "../util/lazy";
import Signal from "../util/signal";
import { Beat, Beats } from "./beats";
import exec from "./exec";
import plugin, { Plugin } from "./plugins";

export interface Choice {
  key: number;
  text: string;
}
export class Ask implements Plugin {
  #choices: Choice[] = [];
  #chose?: number;
  readonly onAsk = new Signal("ask").bridgeTo(Signal.INFO);
  readonly onChoice = new Signal("choice").bridgeTo(Signal.INFO);

  get choices(): Choice[] {
    return this.#choices!;
  }

  import(source: any): void {
    const ask = source.ask;
    this.#choices = ask?.opts;
    this.#chose = ask?.chose;
  }
  export(): undefined | object {
    return {
      ask: {
        choices: this.#choices,
        ...(this.#chose && { chose: this.#chose }),
      },
    };
  }
  ask(...opts: Choice[]) {
    this.#chose = undefined;
    this.#choices = opts;
    exec.trapUser();
    this.onAsk.notify(opts);
  }
  get choice() {
    return this.#chose;
  }
  choose(c: number) {
    for (let opt of this.#choices) {
      if (c == opt.key) {
        this.#chose = c;
        this.#choices = [];
        exec.userReady();
        this.onChoice.notify(opt);
        return;
      }
    }
  }
}
const askPlugin = plugin.add(new Ask());

export interface OptionBeat extends Beat {
  text: Source<string>;
}
export interface AskBeat extends Beats {}
export default function ask(...options: OptionBeat[]): AskBeat {
  const handleUserInput: Beat = {
    do() {
      // We never naively go to next... Instead, we always repeat this element
      // until the user has specified a "good" answer, which is our branch.
      exec.pop();

      if (
        "number" === typeof askPlugin.choice &&
        askPlugin.choice >= 0 &&
        askPlugin.choice < options.length
      ) {
        exec.pushNext(askPlugin.choice);
        return;
      }
      // Otherwise we're not done yet, and loop back to here.
      // But: We need user input as well before we continue.
      exec.trapUser();
      exec.pushNext(options.length);
    },
  };
  return {
    get(i: number) {
      if (i >= options.length) return handleUserInput;
      return options[i];
    },
    do() {
      const displayOptions = options
        .map((beat, key) => {
          if (beat.if && !beat.if()) return undefined;
          let text = unwrap(beat.text);
          if (!text) return undefined;
          return { key, text } as Choice;
        })
        .filter((x) => x != undefined);
      askPlugin.ask(...displayOptions);
      // Then: jump into the special get-the-answers element (see `get`, it's inserted at the end).
      exec.pushChild(options.length);
    },
  };
}
ask.plugin = askPlugin;
