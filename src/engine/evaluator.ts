import LRU from "../util/lru";
import Executor from "./executor";
import { Value } from "./parser";
import { Evaluator as EvaluatorPlugin, Serialization } from "./plugin";

type InValue = undefined | null | Value;

export default class Evaluator extends EvaluatorPlugin {
  private readonly _cache: LRU<string, Function>;
  private _raw: any;
  private _proxy: any;

  constructor(exec: Executor) {
    super();
    this._cache = new LRU(exec.props.compile_cache ?? 1000);
    this._raw = {};
    this._proxy = new Proxy(this._raw, {
      get(target, p, receiver) {
        if (p == "$") return exec;
        if (!(p in target)) target[p] = {};
        return Reflect.get(target, p, receiver);
      },
      set(target, p, newValue, receiver) {
        if (p == "$") return false;
        return Reflect.set(target, p, newValue, receiver);
      },
    });
  }
  import(from: Serialization): void {
    for (let key in Object.keys(this._raw)) {
      delete this._raw[key];
    }
    Object.assign(this._raw, from);
  }
  export(into: Serialization): void {
    into.vars = this._raw;
  }
  get vars() {
    return this._raw;
  }
  boolean(text: InValue, _default = false): boolean {
    return !!(this.raw_eval(text) ?? _default);
  }
  number(text: InValue, _default = 0): number {
    return +(this.raw_eval(text) ?? _default);
  }
  string(text: InValue, _default = ""): string {
    return "string" == typeof text
      ? this.compile(`\`${text}\``)()
      : `${text ?? _default}`;
  }
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
        this._proxy
      )
    );
  }
}

function renameFunction<T extends Function>(fn: T, name: string): T {
  return Object.defineProperty(fn, "name", { value: name });
}
