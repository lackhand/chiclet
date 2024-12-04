export type Concrete<T> = T extends Function ? never : T;
export type Lazy<T> = () => Concrete<T>;
export type Source<T> = Lazy<T> | Concrete<T>;
export type SourceObject<T extends object> = {
  [K in keyof T]: Source<T[K]>;
};
export function isLazy<T>(source: Source<T>): source is Lazy<T> {
  return typeof source === "function";
}
const undefinedValueKey = Symbol("undefinedValueKey");

export default function unwrap<T>(v: Source<T>): Concrete<T> {
  while (isLazy(v)) {
    v = v();
  }
  if (v === undefined) {
    return v;
  }
  if (v === null) {
    return v;
  }
  if (Array.isArray(v)) {
    v = v.map((item) => unwrap(item)) as Concrete<T>;
  } else if (typeof v == "object") {
    let newObject = Object.fromEntries(
      Object.entries(v).map(([k, v]: [string | symbol, any]) => {
        if (k == "do") {
          return [k, v];
        }
        let unwrapped = unwrap(v);
        if (unwrapped === undefined) {
          k = undefinedValueKey;
        }
        return [k, unwrapped];
      })
    );
    // Remove the marker we used to hide undefined values...
    delete (newObject as any)[undefinedValueKey];
    v = newObject as Concrete<T>;
  }
  return v;
}

type Resolve<T, V = void> = (value: T | PromiseLike<T>) => V;
type Reject = (reason?: any) => void;
type Executor<T> = (resolve: Resolve<T>, reject: Reject) => void;
type ThenCb<InT, OutT> =
  | ((value: InT) => OutT | PromiseLike<OutT>)
  | null
  | undefined;
export class LazyPromise<T> extends Promise<T> {
  #resolve?: Resolve<T>;
  #reject?: Reject;
  #executor?: Executor<T>;
  constructor(executor: Executor<T>) {
    super((resolve, reject) => {
      this.#resolve = resolve;
      this.#reject = reject;
    });
    this.#executor = executor;
  }
  then<TResult1 = T, TResult2 = never>(
    resolve: ThenCb<T, TResult1>,
    reject: ThenCb<any, TResult2>
  ): Promise<TResult1 | TResult2> {
    if (this.#executor && this.#resolve && this.#reject) {
      try {
        this.#executor(this.#resolve, this.#reject);
      } finally {
        this.#executor = undefined;
        this.#resolve = undefined;
        this.#reject = undefined;
      }
    }
    return super.then(resolve, reject);
  }
}
export function lazy<T>(cb: () => T): Promise<T> {
  return new LazyPromise((resolve, reject) => {
    try {
      resolve(cb());
    } catch (e) {
      reject(e);
    }
  });
}
