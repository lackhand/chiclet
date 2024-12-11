import plugin from "./plugins";
import settings from "./settings";
import ask from "./ask";
import actor from "./actor";
import Signal from "@/src/util/signal";
import exec, { Key } from "./exec";

interface BaseHistoryEntry {
  type: string;
  i: number;
}
export interface Tell extends BaseHistoryEntry {
  type: "tell";
  key: Key;
  text: string;
}
export interface Ask extends BaseHistoryEntry {
  type: "ask";
  opts: string[];
}
export interface Answer extends BaseHistoryEntry {
  type: "answer";
  key: Key;
  text: string;
}
export type HistoryEntry = Tell | Ask | Answer;

export class History {
  #data: HistoryEntry[] = [];

  get data(): Readonly<HistoryEntry[]> {
    return this.#data;
  }

  readonly onEvent = new Signal("history").bridgeTo(Signal.INFO);

  _unsubs = [
    actor.plugin.onAct.add(({ key, tell }) => {
      tell && this.#push({ type: "tell", key, text: tell });
    }),
    ask.plugin.onAsk.add((opts: string[]) => {
      this.#push({ type: "ask", opts });
    }),
    ask.plugin.onAnswer.add((key: number) => {
      this.#push({ type: "answer", key, text: ask.plugin.asked?.[key] });
    }),
  ];
  #push(record: Partial<HistoryEntry>) {
    const count = exec.count;
    record.i = count;
    // Because React, this wants to be a new instance on each append.
    this.#data = [
      ...this.#data.slice(-(settings.historySize.value - 1)),
      record as HistoryEntry,
    ];
    this.onEvent.notify(count);
  }
  export(): object {
    return {
      log: {
        data: this.#data,
      },
    };
  }
  import(from: any): void {
    this.#data = from.log?.data ?? [];
  }
}
export default plugin.add(new History());
