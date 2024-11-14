import Action from "@/src/engine/action";
import Executor from "@/src/engine/executor";
import { Get, Parser } from "@/src/engine/parser";
import { Key } from "@/src/util/jpath";

/// Given one or more subordinate clauses, checks each in turn until it finds the winner, then jumps into it.
export default class When extends Action {
  clauses: Clause[];
  constructor(clauses: Clause[]) {
    super();
    this.clauses = clauses;
  }
  static parse(parser: Parser) {
    return new When(parser.parseChildren(Clause.parse) as Clause[]);
  }
  get(key: Key) {
    return this.clauses[key as number];
  }
  async run(executor: Executor) {
    executor.pushRelative([0]);
  }
}

export class Clause extends Action {
  guard: Get<boolean>;
  body: Action[];
  constructor(guard: Get<boolean>, body: Action[]) {
    super();
    this.guard = guard;
    this.body = body;
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
      // Remove us from the stack. Capture the name, since that's going to be where we go.
      // This prevents visiting any more clauses.
      const next = [...exec.pop()!];
      // Target our own first child.
      next.push(0);
      // Goto the matching result.
      exec.pushAbsolute(next);
    }
  }
}
