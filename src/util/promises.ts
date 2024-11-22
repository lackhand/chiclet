export type Resolver<T> = (t: T | PromiseLike<T>) => void;
export type Rejector = (reason: any) => void;
export interface PromiseParts<T> {
  promise: Promise<T>;
  resolve: Resolver<T>;
  reject: Rejector;
}
export function promiseParts<T = void>(): PromiseParts<T> {
  // This is standard now but my typescript doesn't seem to have it. Hackhackhack.
  let resolve!: Resolver<T>;
  let reject!: Rejector;
  const promise = new Promise<T>((resolveCb, rejectCb) => {
    resolve = resolveCb;
    reject = rejectCb;
  });
  return { promise, resolve, reject };
}

export function use<T>(
  initial?: T
): [get: () => T | undefined, set: (t: T | undefined) => T | undefined] {
  let value: T | undefined = initial;
  return [
    () => value,
    (t: T | undefined) => {
      const prev = value;
      value = t;
      return prev;
    },
  ];
}

export function accumulate(
  each: Promise<void>[],
  onEach?: () => void
): () => () => void {
  return () => {
    onEach?.();
    const { promise, resolve } = promiseParts();
    each.push(promise);
    return resolve;
  };
}

export async function asyncHead<
  T,
  TGen extends AsyncGenerator<T> = AsyncGenerator<T>
>(from: TGen): Promise<[first: T, rest: undefined | TGen]> {
  const { value, done } = await from.next();
  return [value as T, done ? undefined : from];
}

export async function asyncTake<T>(from: AsyncGenerator<T>): Promise<T[]> {
  let results = [];
  for await (let result of from) {
    results.push(result);
  }
  return results;
}

type Unsubscribe = () => void;
type Handle<T> = (t: T) => void;
type Subscribe<T> = (handle: Handle<T>) => Unsubscribe;

type NextPromise<T> = [t: T, p: Promise<NextPromise<T>>];

export async function* asyncIterateAll<T>(
  subscribe: Subscribe<T>
): AsyncGenerator<T, void, unknown> {
  let { promise, resolve } = promiseParts<NextPromise<T>>();
  let produceResolve = [resolve];
  const unsubscribe = subscribe((t: T) => {
    const { promise, resolve } = promiseParts<NextPromise<T>>();
    const oldResolve = produceResolve[0];
    produceResolve[0] = resolve;
    oldResolve([t, promise]);
  });
  let value;
  try {
    while (true) {
      [value, promise] = await promise;
      yield value;
    }
  } finally {
    unsubscribe();
  }
}

export class CountDownLatch extends Promise<void> {
  private _count = 0;
  private _resolve!: Resolver<void>;
  private _reject!: Rejector;
  constructor() {
    super((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }

  request() {
    this._count++;
    return () => {
      this._count--;
      if (this._count <= 0) {
        this._resolve();
      }
    };
  }

  abort(reason: any) {
    this._reject(reason);
  }
}

// Each time it's awaited, it sleeps until all extant promises are resolved.
type PromiseThen<T = void> = Promise<T>["then"];
type PromiseCatch<T = void> = Promise<T>["catch"];
type PromiseFinally<T = void> = Promise<T>["finally"];
export class Batcher {
  private _outstanding = new Set<Promise<void>>();

  async then(
    resolve: Parameters<PromiseThen>[0],
    _reject: Parameters<PromiseThen>[1]
  ): ReturnType<PromiseThen> {
    while (this._outstanding.size > 0) {
      for (let first of this._outstanding) {
        await first;
        this._outstanding.delete(first);
        break;
      }
    }
    resolve?.();
    return void 0;
  }
  catch(reject: Parameters<PromiseCatch>[0]): ReturnType<PromiseCatch> {
    return this.then(null, reject);
  }
  finally(handle: Parameters<PromiseFinally>[0]): ReturnType<PromiseFinally> {
    return this.then(handle, handle) as Promise<void>;
  }
  push(onResolve: Resolver<void>): Resolver<void> {
    const parts = promiseParts();
    this._outstanding.add(parts.promise);
    const oldResolve = parts.resolve;
    return () => {
      oldResolve();
      this._outstanding.delete(parts.promise);
      onResolve();
    };
  }
}
