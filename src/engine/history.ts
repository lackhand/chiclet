import plugin from "./plugins";
import settings from "./settings";
import ask, { type Choice } from "./ask";
import actor from "./actor";
import Signal from "@/src/util/signal";
import { Key } from "./exec";

interface BaseRecord {
  type: string;
  i: number;
}
export interface Tell extends BaseRecord {
  type: "tell";
  key: Key;
  text: string;
}
export interface Ask extends BaseRecord {
  type: "ask";
  opts: string[];
}
export interface Answer extends BaseRecord {
  type: "answer";
  key: Key;
  text: string;
}
export type Record = Tell | Ask | Answer;

const ASK_PREDICATE = { type: "ask" } as Partial<Ask>;
const TELL_PREDICATE = { type: "tell" } as Partial<Tell>;
export class History {
  #count = 0;
  #data: Record[] = [];

  get data(): Readonly<Record[]> {
    return this.#data;
  }
  #rfind<T extends Record>(predicate: Partial<T>): undefined | T {
    const evals = Object.entries(predicate);
    for (let j = this.#data.length - 1; j >= 0; --j) {
      const here: any = this.#data[j];
      for (let [k, v] of evals) {
        if (here[k] != v) continue;
      }
      return here;
    }
    return undefined;
  }
  get told(): Tell | undefined {
    return this.#rfind(TELL_PREDICATE);
  }
  get asked() {
    return this.#rfind(ASK_PREDICATE);
  }

  readonly onEvent = new Signal("history").bridgeTo(Signal.INFO);

  _unsubs = [
    actor.plugin.onTell.add((key: Key, text: string) => {
      this.#push({
        type: "tell",
        key,
        text,
      });
    }),
    ask.plugin.onAsk.add((choices: Choice[]) => {
      let opts: string[] = [];
      for (let choice of choices) {
        opts[choice.key] = choice.text;
      }
      this.#push({
        type: "ask",
        opts,
      });
    }),
    ask.plugin.onAnswer.add((opt: Choice) => {
      this.#push({
        type: "answer",
        ...opt,
      });
    }),
  ];
  #push(record: Partial<Record>) {
    record.i = this.#count++;
    // Because React, this wants to be a new instance on each append.
    this.#data = [
      ...this.#data.slice(-(settings.historySize.value - 1)),
      record as Record,
    ];
    this.onEvent.notify(this.#count);
  }
  export(): object {
    return {
      log: {
        data: this.#data,
      },
    };
  }
  import(from: any): void {
    this.#count = from.log?.count ?? 0;
    this.#data = [...(from.log?.data ?? [])];
  }
}
export default plugin.add(new History());
