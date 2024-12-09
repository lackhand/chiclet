import seedrandom from "seedrandom";
import plugin, { Plugin } from "./plugins";
import settings from "./settings";
import { Key } from "./exec";

export class Rand implements Plugin {
  #rand?: seedrandom.StatefulPRNG<seedrandom.State.Arc4>;
  import(from: any) {
    const state = from?.rand?.state;
    this.#rand = seedrandom(settings.seed.value, { state: state || true });
  }
  export(): undefined | object {
    return this.#rand && { rand: { state: this.#rand.state() } };
  }

  get unit() {
    return this.#rand!.double();
  }
  get int32() {
    return this.#rand!.int32();
  }
  interval(max: number, min = 0): number {
    return (max - min) * this.unit + min;
  }
  range(max: number): number {
    return Math.floor(this.interval(max));
  }
  element<T>(arr: ReadonlyArray<T>): T {
    return arr[this.range(arr.length)];
  }
  hash(str: Key): number {
    if ("number" === typeof str) {
      return str;
    }
    let hash = 5381;
    for (var i = 0; i < str.length; i++) {
      hash = (hash << 5) + hash + str.charCodeAt(i); /* hash * 33 + c */
    }
    return hash;
  }
  stable<T>(str: string, choices: T[]): T {
    let hash = this.hash(str);
    return choices[hash % choices.length];
  }
}
export default plugin.add(new Rand());
