import {
  parse as kdlParse,
  Node as KdlNode,
  Value as KdlValue,
  Document as KdlDocument,
} from "kdljs";
import Stack from "@/src/util/stack";
import Executor from "./executor";
import Action from "./action";

export type Value = NonNullable<KdlValue>;
interface Node extends KdlNode {}

type Handler<T> = (parser: Parser<T>) => T;
type Handlers<T> = Record<string, Handler<T>>;

export type Get<T = any> = (exec: Executor) => T;

export class Parser<T = Action> {
  private readonly parsers: Handlers<T>;
  private readonly override = new Stack<Handler<T> | null>();
  private readonly default = new Stack<Handler<T>>();

  // offsets into the document/childset for each node.
  private readonly is = new Stack<number>();
  // The tip is the value currently being parsed.
  private readonly nodes = new Stack<Node>();

  get index() {
    return this.is.peek!;
  }
  get node() {
    return this.nodes.peek!;
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

  constructor(
    parsers: Handlers<T>,
    _default?: Handler<T>,
    override?: Handler<T>
  ) {
    this.parsers = parsers;
    if (_default) {
      this.default.push(_default);
    }
    if (override) {
      this.override.push(override);
    }
  }

  compile(text: undefined | null): undefined;
  compile(text: KdlValue): Get<KdlValue>;
  compile(text: undefined | KdlValue): undefined | Get<KdlValue>;
  compile(text: undefined | KdlValue): undefined | Get<KdlValue> {
    if (text == undefined) return undefined;
    switch (typeof text) {
      case "string":
        const fn = new Function(`with (this) { return ${text}}`);
        return Object.defineProperty(
          (exec: Executor) => fn.call(exec.vars),
          "name",
          { value: text }
        );
      default:
        return Object.defineProperty((_: any) => text, "name", { value: text });
    }
  }

  compileText(text: undefined | null): undefined;
  compileText(text: KdlValue): Get<string>;
  compileText(text: undefined | KdlValue): undefined | Get<string>;
  compileText(text: undefined | KdlValue): undefined | Get<string> {
    if (text == undefined) return undefined;
    switch (typeof text) {
      case "string":
        return this.compile(`\`${text}\``) as (exec: Executor) => string;
      default:
        return (_) => `${text ?? ""}`;
    }
  }

  compileGuard(text: undefined | null, flip?: boolean): undefined;
  compileGuard(text: KdlValue, flip?: boolean): Get<boolean>;
  compileGuard(
    text: undefined | KdlValue,
    flip?: boolean
  ): undefined | Get<boolean>;
  compileGuard(
    text: undefined | KdlValue,
    flip?: boolean
  ): undefined | Get<boolean> {
    if (text == undefined) return undefined;
    switch (typeof text) {
      case "string":
        return this.compile(`${flip ? "" : "!"}!(${text})`) as (
          exec: Executor
        ) => boolean;
      default:
        return (_) => !!text;
    }
  }

  parseDocument(document: KdlDocument): Record<string, T> {
    this.nodes.push({
      name: "!!ROOT!!",
      values: [],
      properties: {},
      children: document,
      tags: { name: "", values: [], properties: {} },
    });
    const children = this.parseChildren();
    const ret: any = {};
    for (let i = 0; i < document.length; ++i) {
      ret[document[i].name] = children[i];
    }
    return ret;
  }

  parseText(text: string): Record<string, T> {
    const parsed = kdlParse(text);
    if (parsed.errors?.length) {
      this.throw(parsed.errors);
    }
    if (!parsed.output) {
      this.throw("empty somehow?");
    }
    return this.parseDocument(parsed.output);
  }

  parseChildren(override?: null | Handler<T>): T[] {
    return this.override.with(override, () =>
      this.children.map((n, i) => this.withNode(n, i, () => this.parseNode(n)))
    );
  }

  private withNode<V>(n: Node, i: number, cb: () => V): V {
    return this.is.with(i, () => this.nodes.with(n, cb));
  }

  private parseNode(node: Node): T {
    const handler =
      this.override.peek ??
      this.parsers[node.name] ??
      this.default.peek ??
      this.throw(`Missing handler for ${node.name}`);
    return handler(this);
  }

  throw(reason?: any): never {
    console.error("Parser error at", this.here, reason);
    throw new Error();
  }
}
