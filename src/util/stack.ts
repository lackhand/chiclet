import { last, reversed } from "./objectPath";

export default class Stack<T> {
  // Scenes specified by the user.
  readonly values: T[] = [];
  get isEmpty(): boolean {
    return this.values.length == 0;
  }
  push(frame: T) {
    this.values.push(frame);
  }
  replace(frame: T) {
    this.values.pop();
    this.push(frame);
  }
  replaceAll(frame: T) {
    this.clear();
    this.push(frame);
  }
  clear(): void {
    this.values.length = 0;
  }
  get peek(): undefined | T {
    return last(this.values);
  }
  pop(): undefined | T {
    return this.values.pop();
  }
  firstDefined<V>(cb: (t: T) => undefined | V): undefined | V {
    for (let value of this.values) {
      const v = cb(value);
      if (v !== undefined) {
        return v;
      }
    }
    return undefined;
  }
  lastDefined<V>(cb: (t: T) => undefined | V): undefined | V {
    for (let value of reversed(this.values)) {
      const v = cb(value);
      if (v !== undefined) {
        return v;
      }
    }
    return undefined;
  }
  with<V>(t: T | undefined, cb: () => V): V {
    try {
      if (t !== undefined) this.push(t);
      return cb();
    } finally {
      if (t !== undefined) this.pop();
    }
  }
}
