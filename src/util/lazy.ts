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
unwrap.or = function or<T>(
  v: Source<undefined | Definite<T>>
): undefined | Concrete<Definite<T>> {
  return unwrap(v);
};

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
