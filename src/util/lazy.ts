export type Concrete<T> = T extends Function ? never : T;
export type Lazy<T> = () => Concrete<T>;
export type Source<T> = Lazy<T> | Concrete<T>;
export type SourceObject<T extends object> = {
  [K in keyof T]: Source<T[K]>;
};

export function isLazy<T>(source: undefined | Source<T>): source is Lazy<T> {
  return typeof source === "function";
}
export default function unwrap<T>(v: Source<T>): Concrete<T> {
  while (isLazy(v)) {
    v = v();
  }
  return v;
}
/** Slightly safer around undefines. */
type Definite<T> = Exclude<T, undefined>;
unwrap.or = function unwrapOr<T>(
  v: Source<undefined | Definite<T>>
): undefined | Concrete<Definite<T>> {
  return unwrap(v);
};
unwrap.guard = function unwrapGuard(
  v: undefined | Source<any>
): undefined | boolean {
  if (v === undefined) return undefined;
  return !!unwrap(v);
};

/// The type of the params in a `then` method.
type ThenCb<InT, OutT> =
  | ((value: InT) => OutT | PromiseLike<OutT>)
  | null
  | undefined;

/// A promise whose executor directly exposes the resolve/reject handlers.
export abstract class PartsPromise<T> extends Promise<T> {
  protected parts!: {
    resolve(t: T | PromiseLike<T>): void;
    reject(reason: any): void;
  };
  static get [Symbol.species]() {
    return Promise;
  }
  constructor() {
    let parts = {} as PartsPromise<T>["parts"];
    super((solve, ject) => {
      parts.resolve = solve;
      parts.reject = ject;
    });
    this.parts = parts;
  }
}

/// A promise which runs "later".
export class LazyPromise<T> extends PartsPromise<T> {
  private cb?: () => T;
  constructor(cb: () => T) {
    super();
    this.cb = cb;
  }
  static of<V>(cb: () => V): LazyPromise<V> {
    return new this(cb);
  }
  then<TResult1 = T, TResult2 = never>(
    resolve?: ThenCb<T, TResult1>,
    reject?: ThenCb<any, TResult2>
  ): Promise<TResult1 | TResult2> {
    let cb = this.cb;
    if (cb) {
      this.cb = undefined;
      try {
        this.parts.resolve(cb());
      } catch (e) {
        this.parts.reject(e);
      }
    }
    return super.then(resolve, reject);
  }
}
