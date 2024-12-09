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
  #answered?: number;

  readonly onAsk = new Signal("ask").bridgeTo(Signal.INFO);
  readonly onAnswer = new Signal("answer").bridgeTo(Signal.INFO);

  import(source: any): void {
    this.#answered = source.ask?.answered;
  }
  export(): undefined | object {
    return {
      ask: {
        ...(this.#answered && { answered: this.#answered }),
      },
    };
  }
  ask(asks: OptionBeat[]) {
    const displayOptions = asks
      .map((beat, key) => {
        if (beat.if && !beat.if()) return undefined;
        let text = unwrap(beat.text);
        if (!text) return undefined;
        return { key, text } as Choice;
      })
      .filter((x) => x != undefined);

    this.#answered = undefined;
    exec.trapUser();
    this.onAsk.notify(displayOptions);
  }
  get answer() {
    return this.#answered;
  }
  setAnswer(c: number) {
    this.#answered = c;
    exec.userReady();
    this.onAnswer.notify(c);
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

      // We could handle other types of choices -- free text! -- but we don't.
      // Just numbers at least for now.
      if (
        "number" === typeof askPlugin.answer &&
        askPlugin.answer >= 0 &&
        askPlugin.answer < options.length
      ) {
        exec.pushNext(askPlugin.answer);
        return;
      }
      // Otherwise we're not done yet, and loop back to here.
      // But: We know we'll need user input as well before we continue.
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
      askPlugin.ask(options);
      // Then: jump into the special get-the-answers element (see `get`, it's inserted at the end).
      // This is a push because when we're done, naively, we'll keep going from here.
      exec.pushChild(options.length);
    },
  };
}
ask.plugin = askPlugin;
