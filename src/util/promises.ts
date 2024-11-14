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

export async function* asyncIterateAll<T>(
  subscribe: Subscribe<T>
): AsyncGenerator<Awaited<NonNullable<T>>, void, unknown> {
  let queue: T[] = [];
  let { promise, resolve } = promiseParts();
  const unsubscribe = subscribe((t: T) => {
    queue.push(t);
    resolve();
  });
  try {
    while (true) {
      await promise;
      ({ promise, resolve } = promiseParts());
      let result;
      while ((result = queue.shift())) {
        yield result;
      }
    }
  } finally {
    unsubscribe();
  }
}
