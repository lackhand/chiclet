import { Get, Parser } from "@/src/engine/parser";
import Executor from "../engine/executor";
import Action from "../engine/action";
import { Key, parse, put } from "../util/jpath";

const SKIP = ["skip", "omit"];

/**
 * Receives stage direction by name -- so `foo bar baz=1 { qux ... }` sends actor `foo` the rest of the message...
 *
 * Also covers cases like background etc.
 *
 * After a tell, the system _will_ block until it receives a `told`!
 * Animation may continue after a told if desired. Up to you, really.
 */
export default class Tell extends Action {
  name: Get<string>;
  props: [k: Get<string>, v: Get<any>][];
  values: Get<string>[];
  text: undefined | Get<string>;
  children: Tell[];
  constructor(
    name: Get<string>,
    props: [k: Get<string>, v: Get<any>][],
    values: Get<string>[],
    text: undefined | Get<string>,
    children: Tell[]
  ) {
    super();
    this.name = name;
    this.props = props;
    this.values = values;
    this.text = text;
    this.children = children;
  }
  static parse(parser: Parser, overrideName?: Get<string>): Tell {
    const values = [...parser.values];
    const text = values.pop();
    const name = overrideName ?? parser.compileText(parser.name);
    return new Tell(
      name,
      Object.entries(parser.properties).map(([k, v]) => [
        parser.compileText(k),
        parser.compile(v),
      ]),
      values.map((v) => parser.compileText(v)),
      parser.compileText(text),
      parser.parseChildren((parser) => Tell.parse(parser, name)) as Tell[]
    );
  }
  get(key: Key): undefined | Action {
    return this.children[key as number];
  }
  async run(executor: Executor) {
    let values: string[] = [];
    for (let vf of this.values) {
      const v = vf?.(executor);
      if (v == undefined) {
        continue;
      }
      if (SKIP.includes(v)) {
        return;
      }
      values.push(v);
    }
    const name = this.name(executor);
    const text = this.text?.(executor);
    put(executor.vars, ["actor", name, "text"], text);
    const props = [];
    for (let [kf, vf] of this.props) {
      const k = kf?.(executor);
      const v = vf?.(executor);
      if (k == undefined || v == undefined) {
        continue;
      }
      put(executor.vars, ["actor", name, ...parse(k)], v);
      props.push(v);
    }
    executor.pubsub.publish(`tell.${name}`, { name, text, values, props });
    await executor.pubsub.getOne(`told.${name}`);
    if (this.children?.length) {
      executor.pushRelative([0]);
    }
  }
}
