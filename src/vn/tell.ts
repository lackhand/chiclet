import Parser, { Value } from "@/src/engine/parser";
import Executor from "@/src/engine/executor";
import { last } from "@/src/util/objectPath";
import Each from "@/src/engine/actions/each";
import "@/src/util/pubsubHelpers";

const SKIP = ["skip", "omit"];
type PropsT = Record<string, Value>;
interface ParseOverride {
  name: string;
  props: PropsT;
}

/**
 * Receives stage direction by name -- so `foo bar baz=1 { qux ... }` sends actor `foo` the rest of the message...
 *
 * Also covers cases like background etc.
 *
 * After a tell, the system _will_ block until it receives a `told`!
 * Animation may continue after a told if desired. Up to you, really.
 */
export default class Tell extends Each<Tell> {
  name: string;
  props: PropsT;
  values: Value[];
  text: undefined | string;
  constructor(
    name: string,
    props: PropsT,
    values: Value[],
    text: undefined | string,
    children: Tell[]
  ) {
    super(children);
    this.name = name;
    this.props = props;
    this.values = values;
    this.text = text;
  }

  static parse(parser: Parser, override?: Partial<ParseOverride>): Tell {
    const values = [...parser.values].filter((v) => v != null);
    const text =
      "string" == typeof last(values) ? (values.pop() as string) : undefined;
    const BAD_NAMES = ["-", "", "default"];
    const name = BAD_NAMES.includes(parser.name)
      ? override?.name ?? "anonymous"
      : parser.name;
    const props = nonnull({ ...override?.props, ...parser.properties });

    return new Tell(
      name,
      props as PropsT,
      values,
      text,
      parser.parseChildren((parser) =>
        Tell.parse(parser, { name, props })
      ) as Tell[]
    );
  }
  async run(executor: Executor) {
    let values: string[] = [];
    for (let vf of this.values) {
      const v = executor.eval.string(vf);
      if (!v) {
        continue;
      }
      if (SKIP.includes(v)) {
        return;
      }
      values.push(v);
    }

    const name = executor.eval.string(this.name);
    let actor = executor.eval.vars[name];
    if (!actor) {
      actor = executor.eval.vars[name] = {};
    }

    const props: any = {};
    for (let [kf, vf] of Object.entries(this.props)) {
      const k = executor.eval.string(kf);
      // TODO: I don't love this. Force casting?
      let v: Value = executor.eval.string(vf);
      if (!k || !v) continue;
      let parsed = Number.parseFloat(v);
      v = Number.isFinite(parsed) ? parsed : v;
      props[k] = v;
      actor[k] = v;
    }
    const text = executor.eval.string(this.text);

    await executor.pubsub.ask(
      ["tell", name],
      { name, actor, props, values, text },
      ["told", name]
    );
    // If any...
    await super.run(executor);
  }
}

function nonnull<K extends keyof any, V>(m: Record<K, null | V>): Record<K, V> {
  for (let [k, v] of Object.entries(m)) {
    if (v === null) delete (m as any)[k];
  }
  return m as Record<K, V>;
}
