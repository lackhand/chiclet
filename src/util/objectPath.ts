export type Key = string | number;
export type Path = Readonly<Key[]>;
export type PathString = string; // String representation of a path.

export type Tree<T> = { [k: Key]: Node<T> };
export type Node<T> = T | Tree<T>;

const parseReg = /\.|\[|\]/;
export function parse(str: PathString): Path {
  return str
    .split(parseReg)
    .map((v) => {
      const asNumber = Number(v);
      return Number.isNaN(asNumber) ? v : asNumber;
    })
    .filter((v) => v != "");
}

export function arr(
  strings: Readonly<TemplateStringsArray>,
  ...interpolations: Readonly<Key | Key[]>[]
): Key[] {
  return [...iter(strings, ...interpolations)];
}

export function* iter(
  strings: Readonly<TemplateStringsArray>,
  ...interpolations: Readonly<Key | Key[]>[]
): Iterable<Key> {
  let accum = [""] as [string];
  for (let i = 0; i < interpolations.length; ++i) {
    yield* arrString(accum, strings[i]);
    yield* arrInterpolation(accum, interpolations[i]);
  }
  yield* arrString(accum, strings[strings.length - 1]);
  if (accum[0] != "") yield accum[0];
}
function* arrString(accum: [string], value: string): Iterable<Key> {
  let lastIndex = 0;
  let index = -1;
  while (0 <= (index = value.indexOf(" ", index))) {
    let yielded = `${accum[0]}${value.slice(lastIndex, index)}`;
    accum[0] = "";
    if (yielded != "") {
      yield yielded;
    }
    index++; // Skip over the " ".
    lastIndex = index;
  }
  accum[0] = value.slice(lastIndex);
}
function* arrInterpolation(
  accum: [string],
  value: Readonly<Key | Key[]>
): Iterable<Key> {
  if (Array.isArray(value)) {
    // If we receive an array, assume any remaining fragment needs emission, as do each of the terms of the array.
    if (accum[0] != "") {
      yield accum[0];
      accum[0] = "";
    }
    for (let v of value as Key[]) {
      yield* arrInterpolation(accum, v);
      if (accum[0] != "") {
        yield accum[0];
        accum[0] = "";
      }
    }
    return;
  }
  // Unlike array above, interpolating a string might jam it next to the accumulator.
  if ("string" == typeof value) {
    yield* arrString(accum, value);
    return;
  }
  // But numbers, symbols, whatever -- _those_ have to clear any remaining string.
  // This isn't definite; maybe arr`foo${12}` should allow itself to produce ["foo12"].
  // But you can get it today with arr`foo${""+12}` so... meh?
  if (accum[0] != "") {
    yield accum[0];
    accum[0] = "";
  }
  yield value as Key;
}

export function wrap<T>(value: T, path: Path): Node<T> {
  let ptr: Node<T> = value;
  for (let i = path.length - 1; i >= 0; --i) {
    ptr = { [path[i]]: ptr };
  }
  return ptr;
}
export function visit<T, V>(
  root: Tree<T>,
  path: Path,
  callback: (parent: Node<T>, remainder: Path) => V
): V {
  let ptr: Node<T> = root;
  for (let i = 0; i < path.length; ++i) {
    let nptr = root[path[i]];
    if (nptr === undefined) {
      return callback(ptr, path.slice(i));
    }
    ptr = nptr;
  }
  return callback(ptr, []);
}
export function get<T, V>(
  root: Readonly<Tree<T>>,
  path: Path,
  _default?: V
): Node<T> | V | undefined {
  return visit(root, path, (v, r) => (r.length ? _default : v));
}
export function update<T, O extends T>(
  root: Tree<T>,
  path: Path,
  callback: (old: undefined | T) => O
): O;
export function update<T, O extends T>(
  root: Tree<T>,
  path: Path,
  callback: (old: undefined | Tree<T>) => Tree<O>
): Tree<O>;
export function update<T, O extends Node<T>>(
  root: Tree<T>,
  path: Path,
  callback: (old: undefined | Node<T>) => O
): Node<O> {
  return visit(root, path.slice(0, -1), (parent, r) => {
    const remainder = [...r, last(path)!];
    const assign = remainder.shift() as string | number;

    const treeV = parent as Tree<T>;
    const evaluated = callback(
      remainder.length == 0 ? (treeV[assign] as Node<T>) : undefined
    );
    treeV[assign] = wrap(evaluated, remainder) as Tree<T>;
    return evaluated;
  });
}

export function patch<T>(root: Tree<T>, path: Path, value: Tree<T>): Tree<T> {
  return update(root, path, (old: undefined | Tree<T>) =>
    Object.assign(old ?? {}, value)
  );
}

export function put<T>(root: Tree<T>, path: Path, value: Tree<T>): Tree<T>;
export function put<T>(root: Tree<T>, path: Path, value: T): T;
export function put<T>(root: Tree<T>, path: Path, value: Node<T>): Node<T> {
  if (path.length <= 0) {
    for (let k in root) {
      delete root[k];
    }
    Object.assign(root, value);
    return value;
  }
  return update(root, path, (_old: undefined | Node<T>) => value);
}

export function mergeObjects<T extends object>(obj: T | T[]): T {
  if (Array.isArray(obj)) {
    return obj.reduce((acc, cur) => Object.assign(acc, cur), {} as T);
  }
  return obj;
}

export function isEmpty(obj: any) {
  if (Array.isArray(obj)) {
    return obj.length == 0;
  }
  for (let _key in obj) {
    return false;
  }
  return true;
}
export function* range(max: number, min = 0, stride = 1) {
  for (let i = min; i < max; i += stride) {
    yield i;
  }
}
export function last<T>(arr: undefined | Readonly<T[]>) {
  return arr && arr[arr.length - 1];
}
export function* reversed<T>(ts: undefined | Readonly<T[]>) {
  if (!ts) {
    return;
  }
  for (let i = ts.length - 1; i >= 0; --i) {
    yield ts[i];
  }
}
export function arrEq<A, B extends A>(
  as: undefined | Readonly<A[]>,
  bs: undefined | Readonly<B[]>
): boolean {
  if (as == undefined || bs == undefined) {
    return false;
  }
  return as.length == bs.length && as.every((a, i) => a == bs[i]);
}
