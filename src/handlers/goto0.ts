import Action from "@/src/engine/action";
import { Get, Parser } from "@/src/engine/parser";
import Executor from "../engine/executor";
import { last } from "../util/jpath";

const BREAK: any[] = ["break", 1, true];

/// Resets the current frame (most useful for while loops).
export default class Goto0 extends Action {
  guard: Get<boolean>;
  break: boolean;

  constructor(guard: Get<boolean>, _break?: boolean) {
    super();
    this.guard = guard;
    this.break = !!_break;
  }
  static parse(parser: Parser): Goto0 {
    const guard =
      parser.compileGuard(parser.properties.if) ??
      parser.compileGuard(parser.properties.unless, true) ??
      parser.compileGuard(parser.name)!;
    const _break = BREAK.includes(last(parser.values));
    return new Goto0(guard, _break);
  }
  async run(exec: Executor) {
    if (this.guard(exec)) {
      exec.pop();
      // Sure hope your parent was a loop or scene etc, buddyboy...
      exec.pushRelative([this.break ? Infinity : 0]);
    }
  }
}
