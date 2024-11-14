import { Get, Parser } from "@/src/engine/parser";
import Executor from "../engine/executor";
import Action from "../engine/action";
import { Key, parse } from "../util/jpath";

/**
 * Shows the user an option select screen.
 */
export default class Ask extends Action {
  options: Option[];
  constructor(options: Option[]) {
    super();
    this.options = options;
  }
  get(key: Key): undefined | Action {
    return this.options[key as number];
  }
  async run(manager: Executor) {
    manager.vars.ask = {
      ask: this,
      options: this.options
        .map((o) => Option.toRenderer(manager, o))
        .filter(Boolean),
    };
    while (true) {
      manager.pubsub.publish(`ask`, manager.vars.ask);
      let [response, _topic] = await manager.pubsub.getOne(`answer`);
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
    return new Ask(parser.parseChildren(Option.parse) as Option[]);
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
  static toRenderer(manager: Executor, option: Option): null | object {
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
      manager.throw("jump");
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
