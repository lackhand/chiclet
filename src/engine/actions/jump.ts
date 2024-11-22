import Parser, { Value } from "@/src/engine/parser";
import Executor from "@/src/engine/executor";
import Action from "@/src/engine/action";
import { last } from "@/src/util/objectPath";

const ADDITIVE: any[] = ["add", "&", "and", "+", "with"];

export default class Jump extends Action<never> {
  target: undefined | Value;
  guard: undefined | Value;
  additive: boolean;
  constructor(
    target: undefined | Value,
    guard: undefined | Value,
    additive: boolean
  ) {
    super();
    this.target = target;
    this.guard = guard;
    this.additive = additive;
  }
  static parse(parser: Parser): Jump {
    return new Jump(
      (last(parser.values) as string) ?? parser.throw("No target"),
      parser.properties.if ?? true,
      parser.values.slice(0, -1).some((v) => ADDITIVE.includes(v))
    );
  }
  async run(executor: Executor) {
    if (executor.eval.boolean(this.guard)) {
      const target = executor.eval.string(this.target);
      if (target != "") {
        // TODO: we probably need some kind of trap here, so that jumps can be performed "politely".
        while (executor.pop()) {}
        executor.pushAbsolute([target]);
      }
    }
  }
}
