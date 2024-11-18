import { Key } from "@/src/util/jpath";
import Executor from "@/src/engine/executor";
import { Parser } from "@/src/engine/parser";

export interface Lookup<T = Action> {
  get(key: Key): Promise<T>;
}

export default abstract class Action<T = Action<any>> implements Lookup<T> {
  // As with maps...
  async get(_key: Key): Promise<T> {
    throw new RangeError("no keys");
  }

  async run(_executor: Executor) {
    return;
  }

  static parse(_parser: Parser): Action {
    console.error("Parse called on unoverridden action!");
    throw new Error();
  }
}
