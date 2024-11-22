import {
  parse as kdlParse,
  Node as KdlNode,
  Value as KdlValue,
  Document as KdlDocument,
} from "kdljs";
import Stack from "@/src/util/stack";
import Action from "@/src/engine/action";

export type Value = NonNullable<KdlValue>;
interface Node extends KdlNode {}

type Handler<Tsup, Tsub extends Tsup = Tsup> = (parser: Parser<Tsup>) => Tsub;
type Handlers<T> = Record<string, Handler<T>>;

export default class Parser<T = Action> {
  private readonly parsers: Handlers<T>;
  private readonly override = new Stack<Handler<T> | null>();
  private readonly default: Handler<T>;

  // offsets into the document/childset for each node.
  private readonly is = new Stack<number>();
  // The tip is the value currently being parsed.
  private readonly nodes = new Stack<Node>();

  get index() {
    return this.is.peek!;
  }
  get name() {
    return this.nodes.peek!.name;
  }
  get properties() {
    return this.nodes.peek!.properties;
  }
  get values() {
    return this.nodes.peek!.values;
  }
  get children() {
    return this.nodes.peek!.children;
  }
  get here() {
    return this.nodes.values
      .map((p, i) => `${p.name}/${this.is.values[i]}`)
      .join(".");
  }

  constructor(parsers: Handlers<T>, _default?: Handler<T>) {
    this.parsers = parsers;
    this.default = _default ?? ((p) => p.throw("unhandled"));
  }

  parseDocument<V extends T = T>(
    document: KdlDocument,
    override?: Handler<T, V>
  ): V[] {
    this.nodes.push({
      name: "!!ROOT!!",
      values: [],
      properties: {},
      children: document,
      tags: { name: "", values: [], properties: {} },
    });
    return this.parseChildren(override) as V[];
  }

  parseText<V extends T = T>(text: string, override?: Handler<T, V>): V[] {
    const parsed = kdlParse(text);
    if (parsed.errors?.length) {
      this.throw(parsed.errors);
    }
    if (!parsed.output) {
      this.throw("empty somehow?");
    }
    return this.parseDocument(parsed.output, override) as V[];
  }

  parseChildren<V extends T = T>(
    override?: null | undefined | Handler<T, V>
  ): V[] {
    return this.override.with(override as any as Handler<T, V>, () =>
      this.children.map((n, i) =>
        this.withNode(n, i, () => this.parseNode(n) as V)
      )
    );
  }

  private withNode<V>(n: Node, i: number, cb: () => V): V {
    return this.is.with(i, () => this.nodes.with(n, cb));
  }

  private parseNode(node: Node): T {
    const handler =
      this.override.peek ?? this.parsers[node.name] ?? this.default;
    return handler(this);
  }

  throw(reason?: any): never {
    console.error("Parser error at", this.here, reason, this);
    throw new Error();
  }
}
