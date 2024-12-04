import Signal from "@/src/util/signal";
import actor, { type Actor } from "./actor";
import plugin, { Plugin } from "./plugins";

export type Told = { actor: Actor; update: object; texts: string[] };

/// Supports the dialog box itself: who changed what last?
/// This is a shared resource that can be updated via Actor actions, but also via ask.
/// It also tracks who the last speaker was, etc.
export class Tell implements Plugin {
  #told: Told = { actor: actor.plugin.get(""), update: {}, texts: [] };
  readonly onTell = new Signal("tell").bridgeTo(Signal.INFO);

  import(src: any): void {
    this.#told = src.tell;
  }
  export(): object {
    return { tell: this.#told };
  }
  get told(): Told {
    return this.#told;
  }
  tell(actor: Actor, update: object, texts: string[]) {
    this.#told = { actor, update, texts };
    this.onTell.notify(this.#told);
  }
}
export default plugin.add(new Tell());
