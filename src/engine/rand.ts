import seedrandom from "seedrandom";
import plugin, { Plugin } from "./plugins";
import settings from "./settings";

export class Rand implements Plugin {
  #rand?: seedrandom.StatefulPRNG<seedrandom.State.Arc4>;
  import(from: any) {
    const state = from?.rand?.state;
    this.#rand = seedrandom(settings.values.seed, { state: state || true });
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
}
export default plugin.add(new Rand());
