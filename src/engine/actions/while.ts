import Action from "@/src/engine/action";
import Executor from "@/src/engine/executor";
import Parser, { Value } from "@/src/engine/parser";
import { last } from "@/src/util/objectPath";
import Goto0 from "./goto0";
import Pass from "./pass";
import Each from "./each";

const DO_NAMES = ["do"];

/// Execute each of my children while a condition holds true.
/// The implementation supports do/while, if.
/// It does this using goto0 -- so ironically, the guard is actually the _last_ thing we do,
/// and the main implementation of the
export default class While extends Each {
  do: boolean;
  constructor(_do: boolean, guard: Value, actions: Action[]) {
    super([...actions, new Goto0(guard)]);
    this.do = _do;
  }
  static parse(parser: Parser) {
    return new While(
      DO_NAMES.includes(parser.name) ||
        parser.values.some((v) => DO_NAMES.includes(v as string)),
      parser.properties.if ??
        parser.properties.cond ??
        parser.properties.guard ??
        (last(parser.values) as string) ??
        true,
      parser.parseChildren(null)
    );
  }
  async run(executor: Executor) {
    executor.pushRelative([this.do ? 0 : this.actions.length - 2]);
  }
}
