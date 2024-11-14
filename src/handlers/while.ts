import Action from "@/src/engine/action";
import Executor from "@/src/engine/executor";
import { Get, Parser } from "@/src/engine/parser";
import { Key, last } from "@/src/util/jpath";
import Goto0 from "./goto0";

const DO_NAMES = ["do"];

/// Execute each of my children while a condition holds true.
/// The implementation supports do/while, if/unless.
/// It does this using goto0 -- so ironically, the guard is actually the _last_ thing we do,
/// and the main implementation of the
export default class While extends Action {
  do: boolean;
  actions: Action[];
  constructor(_do: boolean, guard: Get<boolean>, actions: Action[]) {
    super();
    this.do = _do;
    this.actions = [...actions, new Goto0(guard)];
  }
  static parse(parser: Parser) {
    return new While(
      DO_NAMES.includes(parser.name) || parser.values.includes("do"),
      parser.compileGuard(parser.properties.if) ??
        parser.compileGuard(parser.properties.cond) ??
        parser.compileGuard(parser.properties.guard) ??
        parser.compileGuard(parser.properties.unless, true) ??
        parser.compileGuard(
          last(parser.values) as string,
          parser.values.includes("unless")
        ) ??
        parser.throw("Missing while check"),
      parser.parseChildren(null)
    );
  }
  get(key: Key) {
    return this.actions[key as number];
  }
  async run(executor: Executor) {
    executor.pushRelative([this.do ? 0 : this.actions.length - 1]);
  }
}
