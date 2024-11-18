export default class LRU<K, V> {
  private _map = new Map<K, V>();
  private _max: number;
  get max() {
    return this._max;
  }
  constructor(max = 10) {
    this._max = max;
  }

  clear() {
    this._map.clear();
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

  get(key: K): V | undefined {
    const item = this.pop(key);
    if (item !== undefined) {
      this._map.set(key, item);
    }
    return item;
  }
  pop(key?: K): V | undefined {
    key ??= this.firstKey;
    if (key === undefined) {
      return undefined;
    }
    const item = this._map.get(key);
    if (item !== undefined) {
      // refresh key
      this._map.delete(key);
    }
    return item;
  }
  peek(key?: K): V | undefined {
    key ??= this.firstKey;
    if (key === undefined) {
      return undefined;
    }
    return this._map.get(key);
  }
  set(key: K, val: V): V | undefined {
    const old = this._map.get(key);
    this._map.delete(key);
    // evict oldest
    while (this._map.size >= this._max) {
      this._map.delete(this.firstKey!);
    }
    this._map.set(key, val);
    return old;
  }

  get firstKey(): K | undefined {
    for (let k of this._map.keys()) {
      return k;
    }
    return undefined;
  }
}
