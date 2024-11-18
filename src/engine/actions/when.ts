import Action from "@/src/engine/action";
import Executor from "@/src/engine/executor";
import { Get, Parser } from "@/src/engine/parser";
import Each from "./each";

/// Given one or more subordinate clauses, checks each in turn until it finds the winner, then jumps into it.
export default class When extends Each<Clause> {
  constructor(clauses: Clause[]) {
    super(clauses);
  }
  static parse(parser: Parser) {
    return new When(parser.parseChildren(Clause.parse));
  }
  async run(executor: Executor) {
    executor.pushRelative([0]);
  }
}

export class Clause extends Each {
  guard: Get<boolean>;
  constructor(guard: Get<boolean>, body: Action[]) {
    super(body);
    this.guard = guard;
  }
  static DEFAULTY = ["default", "else", "true", true];
  static parse(parser: Parser): Clause {
    const guard = this.DEFAULTY.includes(parser.name)
      ? (_: any) => true
      : parser.compileGuard(parser.properties.if ?? parser.name)!;
    return new Clause(guard, parser.parseChildren(null));
  }
  async run(exec: Executor) {
    if (this?.guard(exec)) {
      // Pop the current frame, skipping next clause (for safety, `when` has to insert a Pass as the last clause).
      exec.pop();
      // Capture our own name, since we'll resume from here (as any scene push).
      // This prevents visiting any more clauses.
      const next = [...exec.peek!, 0];
      // And we know that when always includes a final `pass` clause so it's both safe & necessary to actually pop
      // the stack (the now-skipped `next` clause, or perhaps a pass).

      // Goto the matching result.
      exec.pushAbsolute(next);
    }
  }
}
