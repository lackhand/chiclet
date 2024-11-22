import seedrandom from "seedrandom";
import Executor, { Vars } from "@/src/engine/executor";
import { Plugin } from "@/src/engine/plugin";

type Seedrandom = seedrandom.StatefulPRNG<seedrandom.State.Arc4>;

export default class Rand implements Plugin {
  private readonly _randoms = new Map<string, Seedrandom>();
  constructor(executor: Executor) {
    const { seed } = executor.props;
    this._randoms.set("", seedrandom(seed ?? "slithytoves", { state: true }));
  }
  export(into: Vars): void {
    into.seed = [];
    for (let [k, v] of this._randoms) {
      into.push([k, v.state()]);
    }
  }
  import(from: Vars): void {
    for (let [k, seed] of from.seed ?? []) {
      this._randoms.set(k, seedrandom("", { state: seed }));
    }
    if (!this._randoms.has("")) {
      this._randoms.set("", seedrandom("slithytoves", { state: true }));
    }
  }

  private get(scope: string): Seedrandom {
    let retval = this._randoms.get(scope);
    if (retval) return retval;
    const oldRandom = this.get(scope.slice(0, scope.lastIndexOf(".")));
    const newRandom = seedrandom(`${oldRandom.int32()}`, { state: true });
    this._randoms.set(scope, newRandom);
    return newRandom;
  }

  public quick(scope = ""): number {
    return this.get(scope).quick();
  }
  public double(scope = ""): number {
    return this.get(scope).double();
  }
  public scale(max = 1, min = 0, scope: string): number {
    return min + (max - min) * this.double(scope);
  }
  public int32(scope = ""): number {
    return this.get(scope).int32();
  }
  public int(max: number, min = 1, scope = ""): number {
    return Math.floor(this.scale(max, min, scope));
  }
  public length(max: number, scope = ""): number {
    return this.int(max, 0, scope);
  }
  public peek<T>(array: T[], scope = ""): T {
    return array[this.length(array.length, scope)];
  }
  public pop<T>(array: T[], scope = ""): T {
    const i = this.length(array.length, scope);
    return array.splice(i, 1)[0];
  }
  public push<T>(elem: T, array: T[], scope = ""): number {
    const i = this.length(array.length + 1, scope); // Intentional: insert-before-end.
    array.splice(i, 0, elem);
    return i;
  }
}
