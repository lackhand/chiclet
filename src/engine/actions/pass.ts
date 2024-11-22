import Action from "@/src/engine/action";
import Parser from "@/src/engine/parser";
import Executor from "@/src/engine/executor";

/// Just eats up space :)
export default class Pass extends Action<never> {
  constructor() {
    super();
  }
  static parse(_parser: Parser): Pass {
    return new Pass();
  }
  async run(_exec: Executor) {}
}
