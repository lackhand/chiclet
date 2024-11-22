import Action from "@/src/engine/action";
import Executor from "@/src/engine/executor";
import Parser, { Value } from "@/src/engine/parser";
import { last } from "@/src/util/objectPath";
import Goto0 from "./goto0";
import Pass from "./pass";

const DO_NAMES = ["do"];

/// Execute each of my children while a condition holds true.
/// The implementation supports do/while, if.
/// It does this using goto0 -- so ironically, the guard is actually the _last_ thing we do,
/// and the main implementation of the
export default class While extends Action {
  do: boolean;
  actions: Action[];
  constructor(_do: boolean, guard: undefined | Value, actions: Action[]) {
    super();
    this.do = _do;
    this.actions = [...actions, new Goto0(guard ?? true), new Pass()];
  }
  static parse(parser: Parser) {
    return new While(
      DO_NAMES.includes(parser.name) ||
        parser.values.some((v) => DO_NAMES.includes(v as string)),
      parser.properties.if ??
        parser.properties.cond ??
        parser.properties.guard ??
        (last(parser.values) as string) ??
        parser.throw("Missing while check"),
      parser.parseChildren(null)
    );
  }
  async run(executor: Executor) {
    executor.pushRelative([this.do ? 0 : this.actions.length - 2]);
  }
}
