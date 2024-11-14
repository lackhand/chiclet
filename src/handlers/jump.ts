import { Get, Parser } from "@/src/engine/parser";
import Executor from "@/src/engine/executor";
import Action from "@/src/engine/action";
import { last } from "../util/jpath";

export default class Jump extends Action {
  target: Get<string>;
  guard: Get<boolean>;
  constructor(target: Get<string>, guard: Get<boolean>) {
    super();
    this.target = target;
    this.guard = guard;
  }
  static parse(parser: Parser): Jump {
    return new Jump(
      parser.compileText(last(parser.values) as string) ??
        parser.throw("No target"),
      parser.compileGuard(parser.properties.if) ??
        parser.compileGuard(parser.properties.unless, true) ??
        ((_: any) => true)
    );
  }
  async run(executor: Executor) {
    if (this.guard(executor)) {
      const target = this.target(executor);
      if (target && target != "") {
        // Break the stack down to the last scene we started.
        executor.throw("jump");
        executor.pushAbsolute([target]);
      }
    }
  }
}
