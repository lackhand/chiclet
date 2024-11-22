import Action from "@/src/engine/action";
import Parser, { Value } from "@/src/engine/parser";
import Executor from "@/src/engine/executor";
import { last } from "@/src/util/objectPath";

const BREAK: any[] = ["break", 1, true];

/// Resets the current frame to beginning (0) or to after the end (Infinity).
/// In that way, it's not a _bad_ proxy for a no-label break...
/// If not the child of an `extends Each`, who _knows_ what will happen...
export default class Goto0 extends Action<never> {
  guard: Value;
  break: boolean;

  constructor(guard: Value, _break?: boolean) {
    super();
    this.guard = guard;
    this.break = !!_break;
  }
  static parse(parser: Parser): Goto0 {
    const guard = parser.properties.if ?? true;
    const _break = BREAK.includes(last(parser.values));
    return new Goto0(guard, _break);
  }
  async run(exec: Executor) {
    if (exec.eval.boolean(this.guard)) {
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
