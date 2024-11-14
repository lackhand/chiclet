import { Key, Path } from "../util/jpath";
import Executor from "./executor";
import { Parser } from "./parser";

export interface Lookup<T extends Lookup<T>> {
  get(key: Key): undefined | T;
}

export default abstract class Action implements Lookup<Action> {
  // As with maps...
  get(_key: Key): undefined | Action {
    return undefined;
  }

  async run(_executor: Executor) {
    return;
  }

  beforePush(_executor: Executor): void {
    return undefined;
  }
  afterPush(_executor: Executor): void {
    return undefined;
  }
  afterPop(_executor: Executor): void {
    return undefined;
  }
  catch(_executor: Executor): boolean {
    return false;
  }

  static parse(_parser: Parser): Action {
    console.error("Parse called on unoverridden action!");
    throw new Error();
  }

  static getPath(lookup: Lookup<Action>, path: Path): undefined | Action {
    let ptr = lookup;
    for (let key of path) {
      let next = ptr.get(key);
      if (next == undefined) {
        return undefined;
      }
      ptr = next;
    }
    return ptr as Action;
  }
}
