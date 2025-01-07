export default function knapsack<T>(
  cache: T[],
  cb: (t: T) => undefined | T
): T[] {
  let next = cb(cache.at(-1)!);
  if (next !== undefined) cache.push(next);
  return cache;
}

knapsack.reduce = function knapsackReduce<T1, T2 = T1>(
  cache: T1[],
  source: T2[],
  reducer: (t1: T1, t2: T2, i: number) => undefined | T1,
  from = 0,
  to = source.length
): T1[] {
  for (let i = from; i < to; ++i) {
    let next = reducer(cache.at(-1)!, source[i], i);
    if (next === undefined) break;
    cache.push(next);
  }
  return cache;
};

export class Knapsack<V, I = V> {
  readonly values = [] as V[];
  readonly input = [] as any[];
  get length() {
    return this.input.length;
  }
  constructor(
    readonly calculator: (prev: V, next: I, index: number, totalNext: I[]) => V
  ) {}
  #commonPrefix<I>(newInput: ReadonlyArray<I>) {
    let min = Math.min(newInput.length, this.input.length);
    for (let i = 0; i < min; ++i) {
      if (this.input[i] === newInput[i]) continue;
      return i;
    }
    return min;
  }
  calculate(newBasis: V, newInput: ReadonlyArray<I>) {
    if (newBasis !== undefined && this.values[0] !== newBasis) {
      this.values[0] = newBasis;
      this.values.length = 1;
      this.input.length = 0;
    }
    let prefix = this.#commonPrefix(newInput);
    this.input.length = prefix;
    this.input.push(...newInput.slice(prefix));
    this.values.length = prefix + 1;
    for (let i = prefix; i < this.input.length; ++i) {
      this.values.push(
        this.calculator(this.values.at(-1)!, this.input[i], i, this.input)
      );
    }
    return this.values;
  }
  pop(): [I, V] | undefined {
    let input = this.input.pop();
    if (input !== undefined) return [input, this.values.pop()!];
    return undefined;
  }
}
