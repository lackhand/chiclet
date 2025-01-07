const VALUE_SYMBOL = Symbol("TrieValueSymbol");
type TrieNode<V> = V extends Map<any, any>
  ? never
  : Map<string | typeof VALUE_SYMBOL, V | TrieNode<V>>;

export default class Trie<V> {
  #root = new Map() as TrieNode<V>;
  #size = 0;
  #nodes = 0;
  get size() {
    return this.#size;
  }
  get leafs() {
    return this.#size;
  }
  get nodes() {
    return this.#nodes;
  }
  #getNode(path: string[]): undefined | TrieNode<V> {
    let ptr: TrieNode<V> = this.#root;
    for (let p of path) {
      ptr = ptr.get(p) as TrieNode<V>;
      if (!(ptr instanceof Map)) return undefined;
    }
    return ptr;
  }
  getPath(path: string[]): V | undefined {
    return this.#getNode(path)?.get(VALUE_SYMBOL) as V | undefined;
  }
  get(...path: string[]): V | undefined {
    return this.getPath(path);
  }
  pop(...path: string[]): V | undefined {
    let maps = [this.#root];
    let ptr: TrieNode<V> = this.#root;
    for (let i = 0; i < path.length; ++i) {
      ptr = ptr.get(path[i]) as TrieNode<V>;
      if (!(ptr instanceof Map)) return undefined;
      maps.push(ptr);
    }
    let retval: V | undefined;
    {
      const tip = maps[maps.length - 1];
      retval = tip.get(VALUE_SYMBOL) as V | undefined;
      if (tip.delete(VALUE_SYMBOL)) {
        this.#size--;
      }
      // There's still other children, so no more culling needed.
      if (tip.size) return retval;
    }
    for (let i = path.length - 1; i >= 0; --i) {
      // root, root[path[0]], root[path[0]][path[1]], etc.
      // But we drop the last key!
      // So at path = [a, b, c] (len 3), we have a 3 element map set (above).
      const tip = maps[i];
      tip.delete(path[i]);
      this.#nodes--;
      if (tip.size) return retval;
    }
    return retval;
  }
  set(value: V, ...path: string[]): this {
    let ptr: TrieNode<V> = this.#root;
    for (let p of path) {
      let next = ptr.get(p);
      if (!(next instanceof Map)) {
        ptr.set(p, (next = new Map() as TrieNode<V>));
        this.#nodes++;
      }
      ptr = next;
    }
    ptr.set(VALUE_SYMBOL, value);
    this.#size++;
    return this;
  }
  do<V2 extends V>(
    cb: (old: undefined | V) => undefined | V2,
    path: string[]
  ): undefined | V2 {
    let ptr: TrieNode<V> = this.#root;
    for (let p of path) {
      let next = ptr.get(p);
      if (!(next instanceof Map)) {
        ptr.set(p, (next = new Map() as TrieNode<V>));
        this.#nodes++;
      }
      ptr = next;
    }
    let result = cb(ptr.get(VALUE_SYMBOL) as V | undefined);
    if (result !== undefined) {
      ptr.set(VALUE_SYMBOL, result);
      this.#size++;
      return result;
    }
    this.pop(...path);
    return undefined;
  }
  *keysAt(...path: string[]): Generator<string> {
    for (let key of this.#getNode(path)?.keys() ?? []) {
      if ("string" !== typeof key) continue;
      yield key;
    }
  }
  *keys(): Generator<string[]> {
    let stack = [[[], this.#root]] as [string[], TrieNode<V>][];
    for (let frame = stack.pop(); frame; frame = stack.pop()) {
      let [path, node] = frame;
      for (let key of node.keys()) {
        if ("string" !== typeof key) {
          yield path;
          continue;
        }
        stack.push([[...path, key], node.get(key) as TrieNode<V>]);
      }
    }
  }
}
