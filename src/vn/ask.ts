import { Get, Parser } from "@/src/engine/parser";
import Executor from "@/src/engine/executor";
import Action from "@/src/engine/action";
import { parse } from "../util/jpath";
import Pubsub from "../util/pubsub";
import Each from "../engine/actions/each";
import Pass from "../engine/actions/pass";

/**
 * Shows the user an option select screen.
 */
export default class Ask extends Each<Option> {
  constructor(options: Option[]) {
    super(options);
  }
  async run(manager: Executor) {
    manager.vars.ask = {
      ask: this,
      options: this.actions
        .map((o) => Option.toRenderer(manager, o))
        .filter(Boolean),
    };
    while (true) {
      const answer = manager.plugin(Pubsub).getOne(`answer`);
      manager.plugin(Pubsub).publish(`ask`, manager.vars.ask);
      let [response, _topic] = await answer;
      if (Number.isFinite(response)) {
        manager.pushRelative([response]);
        break;
      } else {
        console.error(
          "Waiting for ask at ",
          manager.peek,
          " but got ",
          response
        );
      }
    }
  }
  static parse(parser: Parser): Ask {
    return new Ask(parser.parseChildren(Option.parse));
  }
}

class Option extends Action {
  i: number;
  display: Get<string>;
  target: undefined | Get<string>;
  if: undefined | Get<boolean>;
  actions: Action[];
  constructor(
    i: number,
    actions: Action[],
    display: (ctx: any) => string,
    target: undefined | Get<string>,
    _if: undefined | Get<boolean>
  ) {
    super();
    this.i = i;
    this.actions = actions;
    this.display = display;
    this.target = target;
    this.if = _if;
  }
  static toRenderer(manager: Executor, option: Option | Pass): null | object {
    if (option instanceof Pass) {
      return null;
    }
    if (option.if && !option.if(manager)) {
      return null;
    }
    const display = option.display(manager);
    if (!display || display == "") {
      return null;
    }
    return {
      i: option.i,
      display,
    };
  }
  async run(manager: Executor) {
    const target = this.target?.(manager);
    if (target) {
      while (manager.pop());
      manager.pushAbsolute(parse(target));
      return;
    }
    // Otherwise just execute our children.
    manager.pushRelative([0]);
  }

  static parse(parser: Parser): Option {
    return new Option(
      parser.index,
      parser.parseChildren(null),
      parser.compileText(parser.properties.display ?? parser.name),
      parser.compileText(parser.properties.target),
      parser.compileGuard(parser.properties.if) ??
        parser.compileGuard(parser.properties.unless, true)
    );
  }
}
