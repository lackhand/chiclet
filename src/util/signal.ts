import { channel, run } from "./promises";

export type Listener = (...args: any[]) => void;
export default class Signal {
  #sending = 0;
  #listeners: (undefined | Listener)[] = [];
  constructor(public name: string | Symbol = Symbol()) {}
  notify(...args: any[]) {
    this.#notify(this, args);
  }
  #notify(thiz: Signal, args: any[]) {
    this.#sending += 1;
    try {
      for (let i = 0; i < this.#listeners.length; ++i) {
        const sub = this.#listeners[i];
        if (!sub) continue;
        try {
          sub.apply(thiz, args);
        } catch (e) {
          console.error(this, "Publish errored", e);
        }
      }
    } finally {
      this.#sending -= 1;
    }
    this.#cullUnsubscribed();
  }
  add(listener: Listener): () => void {
    this.#listeners.push(listener);
    return () => this.remove(listener);
  }
  /// Echos everything from this signal into that signal, with this signal prepended to the args.
  bridgeTo(signal: Signal): this {
    this.add((...args: any[]) => {
      signal.notify(this.name, ...args);
    });
    return this;
  }
  remove(sub: Listener): this {
    let i = this.#listeners.indexOf(sub);
    if (i >= 0) {
      this.#listeners[i] = undefined;
    }
    this.#cullUnsubscribed();
    return this;
  }
  removeAll(): void {
    for (let i = 0; i < this.#listeners.length; ++i) {
      this.#listeners[i] = undefined;
    }
    this.#cullUnsubscribed();
  }
  #cullUnsubscribed() {
    if (this.#sending > 0) return;
    let deleted = 0;
    for (let i = 0; i < this.#listeners.length; ++i) {
      if (this.#listeners === undefined) {
        deleted += 1;
        continue;
      }
      this.#listeners[i - deleted] = this.#listeners[i];
    }
    this.#listeners.length -= deleted;
  }
  next(): Promise<any[]> {
    return new Promise((resolve) => {
      const unsub = this.add((...msg: any[]) => {
        unsub();
        resolve(msg);
      });
    });
  }
  async *[Symbol.asyncIterator](): AsyncGenerator<any[]> {
    const [consume, produce] = channel<any[]>();
    const unsub = this.add(produce);
    try {
      while (true) yield await consume();
    } finally {
      unsub();
    }
  }

  static readonly DEBUG = run(new Signal("DEBUG"), (it) => {
    it.add((msg, from) => console.debug(msg, "from", from));
  });
  static readonly INFO = run(new Signal("INFO"), (it) => {
    it.add((msg, from) => console.info(msg, "from", from));
  });
  static readonly WARN = run(new Signal("WARN"), (it) => {
    it.add((msg, from) => console.warn(msg, "from", from));
  });
  static readonly ERROR = run(new Signal("ERROR"), (it) => {
    it.add((msg, from) => console.error(msg, "from", from));
  });
}
