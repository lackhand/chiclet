import Action from "@/src/engine/action";
import { Get, Parser } from "@/src/engine/parser";
import Executor from "@/src/engine/executor";
import { last } from "@/src/util/jpath";

const BREAK: any[] = ["break", 1, true];

/// Resets the current frame to beginning (0) or to after the end (Infinity).
/// In that way, it's not a _bad_ proxy for a no-label break...
/// If not the child of an `extends Each`, who _knows_ what will happen...
export default class Goto0 extends Action<never> {
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
      // Goto0 may _NEVER_ be the final statement in a clause.
      // If they are, then the frame will have already popped off, and their hacky reset strategy will fail.
      const frame = [...exec.peek];
      frame.pop();
      frame.push(this.break ? Infinity : 0);
      // Remove the following frame -- legitimate neighbor or else a synthetic `pass`.
      exec.pop();
      exec.pushAbsolute(frame);
    }
  }
}
