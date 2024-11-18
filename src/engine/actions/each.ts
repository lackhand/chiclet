import Pass from "./pass";
import { Key } from "@/src/util/jpath";
import Action from "@/src/engine/action";
import Executor from "@/src/engine/executor";
import { Parser } from "@/src/engine/parser";

export default abstract class Each<T extends Action = Action> extends Action<
  T | Pass
> {
  readonly actions: (T | Pass)[];

  // We _always_ insert a `pass` as the last action, so that any `goto` can work correctly.
  constructor(actions: T[]) {
    super();
    this.actions = actions?.length ? [...actions, new Pass()] : [];
  }
  static parse(_parser: Parser): Action {
    console.error("Parse called on unoverridden action!");
    throw new Error();
  }
  // As with maps...
  async get(key: Key): Promise<T | Pass> {
    return this.actions[key as number];
  }

  async run(executor: Executor) {
    if (this.actions?.length) {
      executor.pushRelative([0]);
    }
  }
}
