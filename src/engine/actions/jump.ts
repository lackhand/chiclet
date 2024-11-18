import { Get, Parser } from "@/src/engine/parser";
import Executor from "@/src/engine/executor";
import Action from "@/src/engine/action";
import { last } from "@/src/util/jpath";

const ADDITIVE: any[] = ["add", "&", "and", "+", "with"];

export default class Jump extends Action<never> {
  target: Get<string>;
  guard: Get<boolean>;
  additive: boolean;
  constructor(target: Get<string>, guard: Get<boolean>, additive: boolean) {
    super();
    this.target = target;
    this.guard = guard;
    this.additive = additive;
  }
  static parse(parser: Parser): Jump {
    return new Jump(
      parser.compileText(last(parser.values) as string) ??
        parser.throw("No target"),
      parser.compileGuard(parser.properties.if) ??
        parser.compileGuard(parser.properties.unless, true) ??
        ((_: any) => true),
      parser.values.slice(0, -1).some((v) => ADDITIVE.includes(v))
    );
  }
  async run(executor: Executor) {
    if (this.guard(executor)) {
      const target = this.target(executor);
      if (target && target != "") {
        // TODO: we probably need some kind of trap here, so that jumps can be performed "politely".
        while (executor.pop()) {}
        executor.pushAbsolute([target]);
      }
    }
  }
}
