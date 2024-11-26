import Parser, { Value } from "@/src/engine/parser";
import Executor from "@/src/engine/executor";
import { last } from "@/src/util/objectPath";
import Each from "@/src/engine/actions/each";
import "@/src/util/pubsubHelpers";

const SKIP = ["skip", "omit"];
type PropsT = Record<string, Value>;
interface ParseOverride {
  name: string;
  values: Value[];
  props: PropsT;
}

/**
 * Receives stage direction by name -- so `foo bar baz=1 { qux ... }` sends actor `foo` the rest of the message...
 *
 * Also covers cases like background etc.
 *
 * After a tell, the system _will_ block until it receives a `told`!
 *
 * Animation may continue after a told if desired. Up to you, really.
 *
 * The props are values which are set on the actor.
 * The values are related to the current message -- the last is the text to display (if any), while any preceeding values can be used to set flags about this message.
 * They're not persisted on the actor or visible outside of the context of the message.
 *
 * Children are nestled under this send, and inherit from it:
 *   - names inherit if the child name is bad (`tell`, `-`, `""`, etc).
 *   - attributes are merged
 *   - non-text values are appended
 *   - (the text value is never forwarded)
 *
 * Special value skip -- or substitutions that evaluate to skip -- cause the entire `tell` to be discarded.
 */
export default class Tell extends Each<Tell> {
  name: string;
  props: PropsT;
  values: Value[];
  text: string;
  constructor(
    name: string,
    props: PropsT,
    values: Value[],
    text: string,
    children: Tell[]
  ) {
    super(children);
    this.name = name;
    this.props = props;
    this.values = values;
    this.text = text;
  }

  static parse(parser: Parser, override?: Partial<ParseOverride>): Tell {
    const values = [...(override?.values ?? []), ...parser.values].filter(
      (v) => v != null
    );
    // If we didn't say anything at all here... we definitely don't intend to say the last value...
    if (!parser.values.length) {
      values.push("");
    }
    const text =
      "string" == typeof last(values) ? (values.pop() as string) : "";
    const name = BAD_NAMES.includes(parser.name)
      ? override?.name ?? "tell"
      : parser.name;
    const props = nonnull({ ...override?.props, ...parser.properties });

    return new Tell(
      name,
      props as PropsT,
      values,
      text,
      parser.parseChildren((parser) =>
        Tell.parse(parser, { name, props, values })
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
      let asFloat = Number.parseFloat(v);
      v = Number.isFinite(asFloat) ? asFloat : BOOLPARSE[v] ?? v;
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
const BAD_NAMES = ["-", "", "tell"];
const BOOLPARSE = { true: true, false: false } as {
  true: true;
  false: false;
  [k: string]: boolean | undefined;
};
