import plugin from "./plugins";
import settings from "./settings";
import ask, { type Choice } from "./ask";
import tell, { type Told } from "./tell";
import Signal from "../util/signal";

interface Record {
  i: number;
  type: "tell" | "ask" | "answer";
  label?: string | number;
  texts: string[];
}

export class History {
  #count = 0;
  #data: Record[] = [];
  readonly onEvent = new Signal("history").bridgeTo(Signal.INFO);
  _unsubs = [
    tell.onTell.add((update: undefined | Told) => {
      if (!update) {
        return;
      }
      let {
        actor: { name: label },
        texts,
      } = update;
      texts ??= [];
      this.#push({
        type: "tell",
        label,
        texts,
      });
    }),
    ask.plugin.onAsk.add((opts: Choice[]) => {
      let texts: string[] = [];
      for (let opt of opts) {
        texts[opt.key] = opt.text;
      }
      this.#push({
        type: "ask",
        texts,
      });
    }),
    ask.plugin.onChoice.add((opt: Choice) => {
      this.#push({
        type: "answer",
        label: opt.key,
        texts: [opt.text],
      });
    }),
  ];
  get data(): Readonly<Record[]> {
    return this.#data;
  }
  #push(record: Partial<Record>) {
    record.i = this.#count++;
    // Because React, this wants to be a new instance on each append.
    this.#data = [
      ...this.#data.slice(-(settings.values.historySize - 1)),
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
