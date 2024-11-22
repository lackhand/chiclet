import Parser, { Value } from "@/src/engine/parser";
import Executor from "@/src/engine/executor";
import Action from "@/src/engine/action";
import { arr, parse } from "../util/objectPath";
import Each from "../engine/actions/each";
import Pass from "../engine/actions/pass";
import "@/src/util/pubsubHelpers";

/**
 * Shows the user an option select screen.
 */
export default class Ask extends Each<Option> {
  constructor(options: Option[]) {
    super(options);
  }
  async run(manager: Executor) {
    const options = this.actions
      .map((o) => Option.toRenderer(manager, o))
      .filter((o) => o != null);
    manager.eval.vars.ask = {
      ask: this,
      options,
    };
    while (true) {
      let [_topic, response] = await manager.pubsub.ask(
        ASK_TOPIC,
        manager.eval.vars.ask,
        ANSWER_TOPIC
      );
      if (Number.isFinite(response)) {
        const option = options.find((o) => o && o.i == response);
        manager.pubsub.publish(ECHO_TOPIC, option);
        manager.pushRelative([response]);
        break;
      }
      console.error(
        "Waiting for ask at ",
        manager.peek,
        " but got bad ",
        response
      );
    }
  }
  static parse(parser: Parser): Ask {
    return new Ask(parser.parseChildren(Option.parse));
  }
}

const ASK_TOPIC = arr`ask`;
const ANSWER_TOPIC = arr`answer`;
const ECHO_TOPIC = arr`echo answer`;

export interface DisplayOption {
  i: number;
  display: string;
}
class Option extends Each {
  i: number;
  display: Value;
  target: undefined | Value;
  if: undefined | Value;
  constructor(
    i: number,
    actions: Action[],
    display: Value,
    target: undefined | Value,
    _if: undefined | Value
  ) {
    super(actions);
    this.i = i;
    this.display = display;
    this.target = target;
    this.if = _if;
  }
  static toRenderer(
    manager: Executor,
    option: Option | Pass
  ): null | DisplayOption {
    if (option instanceof Pass) {
      return null;
    }
    if (!manager.eval.boolean(option.if)) {
      return null;
    }
    const display = manager.eval.string(option.display);
    if (!display || display == "") {
      return null;
    }
    return {
      i: option.i,
      display,
    };
  }
  async run(manager: Executor) {
    const target = manager.eval.string(this.target);
    if (target) {
      while (manager.pop());
      manager.pushAbsolute(parse(target));
      return;
    }
    // Otherwise just execute our children.
    // We have to self-destruct first though, or else we keep selecting options.
    const here = manager.peek;
    manager.pop();
    manager.pushAbsolute([...here, 0]);
  }

  static parse(parser: Parser): Option {
    return new Option(
      parser.index,
      parser.parseChildren(null),
      parser.properties.display ?? parser.name,
      parser.properties.target ?? undefined,
      parser.properties.if ?? true
    );
  }
}
