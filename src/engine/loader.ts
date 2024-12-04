import { Beat, Beats } from "./beats";
import { Key, Path } from "./exec";
import plugin from "./plugins";

export type Module = any;
export type Entry<T> = [key: Key, value: T];
// A story is
export class Loader {
  #awaiting = new Set<string>();

  #pathCache: [] | [module: Entry<Module>, ...beats: Entry<Beat>[]] = [];

  async load(path: Path): Promise<undefined | Beat> {
    switch (path.length) {
      case 0:
        return undefined;
      case 1:
        path = [...path, "default"];
        break;
    }
    await this.loadModule(path);
    for (let i = 1; i < path.length; ++i) {
      this.fillPathCache(path, i);
    }
    return this.#pathCache[path.length - 1]?.[1];
  }
  peekAt(length?: number): undefined | Beat {
    length ??= -1;
    if (length < 0) {
      length = length + this.#pathCache.length;
    }
    return this.#pathCache[length]?.[1];
  }
  private fillPathCache(path: Path, i: number): void {
    const key = path[i];
    if (i < this.#pathCache.length && key == this.#pathCache[i][0]) {
      return;
    }
    this.#pathCache.length = i;
    const [_key, prev] = this.#pathCache[i - 1];
    const next = i == 1 ? prev[key] : (prev as Beats).get(key as number);
    if (!next) {
      return;
    }
    (this.#pathCache as any[]).push([key, next]);
  }
  private async loadModule(path: Path): Promise<void> {
    const [modName] = path;
    if ("string" !== typeof modName) {
      const error = new Error(`${modName} isn't a module name`);
      throw error;
    }
    this.#awaiting.add(modName);
    try {
      // https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars#limitations
      const module = await import(`../story/${modName}.ts`);
      this.#pathCache.length = 0;
      (this.#pathCache as any[]).push([modName, module]);
      return;
    } catch (e) {
      throw e;
    } finally {
      this.#awaiting.delete(modName);
    }
  }
}
export default plugin.add(new Loader());
