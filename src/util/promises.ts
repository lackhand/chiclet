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

type Unsubscribe = () => void;
type Handle<T> = (t: T) => void;
type Subscribe<T> = (handle: Handle<T>) => Unsubscribe;

/// Sets up a prod/consumer channel with internal infinite queueing.
/// There can only be at most one consumer at a time, which will block waiting for input.
export function channel<T = void>(
  init?: T
): [consume: () => Promise<T>, produce: (t: T) => void] {
  const queued: T[] = [];
  if (init !== undefined) {
    queued.push(init);
  }
  let resolve: undefined | ((t: T) => void);
  return [
    (): Promise<T> => {
      if (queued.length) {
        return Promise.resolve(queued.shift()!);
      }
      if (resolve) {
        throw new Error("Consuming while someone else is already consuming!");
      }
      let promise;
      ({ promise, resolve } = promiseParts());
      return promise;
    },
    (t: T) => {
      queued.push(t);
      if (resolve) {
        // There's someone waiting for this result, so wake them up.
        resolve(queued.shift()!);
        resolve = undefined;
      }
    },
  ];
}

export async function* asyncIterateAll<T>(
  subscribe: Subscribe<T>
): AsyncGenerator<T, void, unknown> {
  const [consume, produce] = channel<T>();
  let unsubscribe = subscribe(produce);
  try {
    while (true) {
      yield consume();
    }
  } finally {
    unsubscribe();
  }
}

type AnyF<T extends any[] = any[], V = any> = (...args: T) => V;
type DupF<F1 extends AnyF> = (...args: Parameters<F1>) => ReturnType<F1>;
export function once<F1 extends AnyF>(cb: F1): DupF<F1> {
  let passed: undefined | boolean = undefined;
  let value: any = undefined;
  let threw: any = undefined;
  return (...args) => {
    switch (passed) {
      case true:
        return value!;
      case false:
        throw threw;
      default:
        try {
          value = cb(...args);
          passed = true;
          return value;
        } catch (e) {
          threw = e;
          passed = false;
          throw e;
        }
    }
  };
}

/// A latch batches up operations -- repeatable countdownLatch style.
/// When called, it returns an "unblocker" method.
/// The unblocker (when called) returns a promise which will be fulfilled when equal blocks and unblocks have been called.
/// This is always during execution of an unblock (because we start at 0 and require a block before giving access to the promise).
/// At this point future unblocks return a novel promise.
export function latch(): () => () => Promise<void> {
  let { resolve, promise } = promiseParts();
  let count = 0;
  function decr() {
    if (--count !== 0) return promise;
    resolve();
    // So: the count is 0, so we need to prepare to start a new batch.
    const oldPromise = promise;
    ({ resolve, promise } = promiseParts());
    // But the value we just resolved is the previous one!
    return oldPromise;
  }
  function incr() {
    ++count;
    return decr;
  }
  return incr;
}

/// Really just here to enable kotlinlike tailcall.
export function run<T>(t: T, cb: (t: T) => void): T {
  cb.call(t, t);
  return t;
}

export function millis(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
