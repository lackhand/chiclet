export default class LRU<K, V = any> {
  #map = new Map<K, V>();
  #max: number;
  get max() {
    return this.#max;
  }
  get size() {
    return this.#map.size;
  }
  constructor(max = 10) {
    this.#max = max;
  }

  clear() {
    this.#map.clear();
  }

  lookup(key: K, source: undefined | ((k: K) => undefined | V)) {
    let result = this.get(key);
    if (result === undefined) {
      result = source?.(key);
      if (result !== undefined) {
        this.set(key, result);
      }
    }
    return result;
  }

  get(key: K, init: () => V): V;
  get(key: K): V | undefined;
  get(key: K, init?: () => V): V | undefined {
    let item = this.pop(key);
    item ??= init?.();
    if (item !== undefined) {
      this.#map.set(key, item);
    }
    return item;
  }

  pop(key?: K): V | undefined {
    key ??= this.firstKey;
    if (key === undefined) {
      return undefined;
    }
    const item = this.#map.get(key);
    if (item !== undefined) {
      // refresh key
      this.#map.delete(key);
    }
    return item;
  }
  peek(key?: K): V | undefined {
    key ??= this.firstKey;
    if (key === undefined) {
      return undefined;
    }
    return this.#map.get(key);
  }
  set(key: K, val: V): V | undefined {
    const old = this.#map.get(key);
    this.#map.delete(key);
    // evict oldest
    while (this.#map.size >= this.#max) {
      this.#map.delete(this.firstKey!);
    }
    this.#map.set(key, val);
    return old;
  }

  get firstKey(): K | undefined {
    for (let k of this.#map.keys()) {
      return k;
    }
    return undefined;
  }

  [Symbol.iterator]() {
    return this.#map[Symbol.iterator]();
  }
  keys() {
    return this.#map.keys();
  }
  values() {
    return this.#map.values();
  }
  entries() {
    return this.#map.entries();
  }
}
