import Action from "@/src/engine/action";
import Executor from "@/src/engine/executor";
import Parser, { Value } from "@/src/engine/parser";
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

const DEFAULTY = ["default", "else", "true", true];
export class Clause extends Each {
  guard: Value;
  constructor(guard: Value, body: Action[]) {
    super(body);
    this.guard = guard;
  }
  static parse(parser: Parser): Clause {
    const guard = DEFAULTY.includes(parser.name)
      ? true
      : parser.properties.if ?? parser.values[0] ?? parser.name;
    return new Clause(guard, parser.parseChildren(null));
  }
  async run(exec: Executor) {
    if (exec.eval.boolean(this.guard)) {
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
