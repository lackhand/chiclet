import LRU from "../util/lru";
import { arr } from "../util/objectPath";
import Executor from "./executor";
import { Value } from "./parser";
import { Evaluator as EvaluatorPlugin, Serialization } from "./plugin";

type InValue = undefined | null | Value;

export default class Evaluator extends EvaluatorPlugin {
  constructor(
    _exec: Executor,
    private _cache = new LRU<string, Function>(
      _exec.props.compile_cache ?? 1000
    ),
    private _handler = new Handler(_exec)
  ) {
    super();
  }
  import(from: Serialization): void {
    this._handler.import(from.vars);
  }
  export(into: Serialization): void {
    into.vars = this._handler.export();
  }
  get vars() {
    return this._handler.root;
  }
  boolean(text: InValue, _default = false): boolean {
    return !!(this.raw_eval(text) ?? _default);
  }
  bool = this.boolean.bind(this);
  b = this.bool;
  number(text: InValue, _default = 0): number {
    return +(this.raw_eval(text) ?? _default);
  }
  num = this.number.bind(this);
  n = this.num;
  integer = this.number.bind(this);
  int = this.integer;
  i = this.integer;
  string(text: InValue, _default = ""): string {
    return "string" == typeof text
      ? this.compile(`\`${text}\``)()
      : `${text ?? _default}`;
  }
  str = this.string.bind(this);
  s = this.str;

  eval(text: InValue, _default?: any): any {
    return this.raw_eval(text) ?? _default;
  }

  // When a string, compiles it and evaluates it.
  // When another type, returns it (coercing null to undef).
  private raw_eval(text: InValue): any {
    if ("string" == typeof text) {
      return this.compile(text)();
    }
    return text ?? undefined;
  }

  private compile(text: string): Function {
    return this._cache.get(text, () =>
      renameFunction(new Function(`with (this) { return ${text}}`), text).bind(
        this._handler.root
      )
    );
  }
}

function renameFunction<T extends Function>(fn: T, name: string): T {
  return Object.defineProperty(fn, "name", { value: name });
}

type Property = string | symbol;
class Handler<T extends Object = Object> implements ProxyHandler<T> {
  private _root: any;
  private _proxies = new WeakMap<object, object>();
  private _typedEntries = new WeakMap<object, (p: Property) => any>();
  constructor(private _executor: Executor) {
    this.import(_executor.props.vars ?? {});
  }

  get raw(): object {
    return this._root;
  }
  get root(): object {
    return this._proxies.get(this._root)!;
  }

  import(vars: object) {
    this._root = {};
    this._proxies.set(this._root, new Proxy(this._root, this));
    this._typedEntries.set(this._root, (p) => ({ name: p }));
    for (let [k, v] of Object.entries(vars)) {
      this.mergeSet(this.root, k, v);
    }
  }
  private mergeSet(into: any, k: Property, v: any) {
    if ("object" == typeof v && !Array.isArray(v)) {
      into[k] = {};
      for (let [k2, v2] of Object.entries(v)) {
        this.mergeSet(into[k], k2, v2);
      }
      return;
    }
    into[k] = v;
  }
  export(): object {
    return this._root;
  }

  get(target: any, p: Property, _receiver: any): any {
    if (p == "$") return this._executor;
    let obj = target[p];
    if (obj === undefined) {
      obj = target[p] = this._typedEntries.get(target)?.(p) ?? defaultByP(p);
    }
    if (typeof obj !== "object") {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj;
    }
    let proxy = this._proxies.get(obj);
    if (!proxy) {
      proxy = new Proxy(obj, this);
      this._proxies.set(obj, proxy!);
      let typedEntries = typedEntriesByP(p);
      if (typedEntries) {
        this._typedEntries.set(obj, typedEntries);
      }
    }
    return proxy;
  }

  set(target: any, p: Property, newValue: any, receiver: any) {
    if (p == "$") return false;
    const oldValue = this.get(target, p, receiver);
    switch (typeof oldValue) {
      case "boolean":
        newValue = !!newValue;
        break;
      case "number":
        newValue = +(newValue ?? 0);
        break;
      case "string":
        newValue = "" + (newValue ?? "");
        break;
    }
    this._executor.pubsub.publish([...VAR_SET], {
      target,
      p,
      oldValue,
      newValue,
      receiver,
    });
    return Reflect.set(target, p, newValue, receiver);
  }
}

const VAR_SET = arr`var set debug`;

const DEFAULTS: [RegExp, () => any][] = [
  [/_b(ool(ean)?)?$/, () => false],
  [/_i(nt(eger)?)?$/, () => 0],
  [/_n(um(ber)?)?$/, () => 0],
  [/_s(tr(ing)?)?$/, () => ""],
  [/_a(rr(ay)?)?$/, () => []],
  [/^(w|h|r|x|y|z|i|j)$/, () => 0],
  [/_count$/, () => 0],
  [/_total$/, () => 0],
  [/_stack$/, () => []],
];
function defaultByP(p: string | symbol) {
  if (typeof p == "symbol") return {};
  for (let [regexp, getDefault] of DEFAULTS) {
    if (regexp.test(p)) return getDefault();
  }
}

const TYPEDS: [RegExp, () => any][] = [
  [/^b(ool)?(s)?$/, () => false],
  [/^i(nt)?(s)?$/, () => 0],
  [/^c(ount)?(s)?$/, () => 0],
  [/^total(s)?$/, () => 0],
  [/^stat(s)?$/, () => 0],
];
function typedEntriesByP(p: string | symbol): undefined | (() => any) {
  if (typeof p == "symbol") return undefined;
  for (let [regexp, getTypes] of TYPEDS) {
    if (regexp.test(p)) return getTypes;
  }
  return undefined;
}
