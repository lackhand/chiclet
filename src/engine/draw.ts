import { Actor } from "./actor";
import { Key } from "./exec";
import plugin from "./plugins";

export type Drawer<T = any> = (actor: Actor) => undefined | T;

export class Draw<T = any> {
  #drawers = new Map<Key, Drawer<T>[]>();
  default?: Drawer<T>;

  add(key: Key, ...newDrawers: Drawer<T>[]) {
    let drawers = this.#drawers.get(key);
    if (!drawers) {
      this.#drawers.set(key, (drawers = []));
    }
    drawers.push(...newDrawers);
  }
  delete(key: Key) {
    this.#drawers.delete(key);
  }
  clear() {
    this.#drawers.clear();
  }
  draw(actor: Actor): T {
    const drawers = this.#drawers.get(actor.key);
    if (drawers) {
      for (let i = drawers.length - 1; i >= 0; --i) {
        let result = drawers[i](actor);
        if (result) return result;
      }
    }
    let result = this.default?.(actor);
    if (result) return result;
    throw new Error(`No fallback for actor ${actor.key}`);
  }
}
export default plugin.add(new Draw());
