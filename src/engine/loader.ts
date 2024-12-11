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
    for (let i = 0; i < path.length; ++i) {
      if (path[i] == this.#pathCache[i]?.[0]) continue;
      this.#pathCache.length = i;
      switch (i) {
        case 0:
          await this.loadModule(path);
          break;
        case 1:
          await this.fillPathCache(path, i);
          break;
        default:
          await this.fillPathCache(path, i);
          break;
      }
      const added = this.#pathCache[this.#pathCache.length - 1][1];
      if ("function" === typeof added.preload) {
        console.log("Preloading", added);
        await added.preload();
      }
    }
    return this.#pathCache[path.length - 1]?.[1];
  }
  peekAt(length?: number): undefined | Beat {
    length ??= -1;
    if (length < 0) {
      length += this.#pathCache.length - 1;
    }
    return this.#pathCache[length]?.[1];
  }
  #push(key: Key, next: Beat | Module) {
    (this.#pathCache as any[]).push([key, next]);
  }
  private fillPathCache(path: Path, i: number) {
    const key = path[i];
    const [_key, prev] = this.#pathCache[i - 1];
    // Handle the module load separately from everyone else -- that's the `prev[key]` lookup -- and thereafter, follow the children arrays.
    // Which must be fully realized!
    const next = i == 1 ? prev[key] : (prev as Beats).children?.[key as number];
    if (!next) {
      return;
    }
    this.#push(key, next);
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
      this.#push(modName, module);
      return;
    } catch (e) {
      throw e;
    } finally {
      this.#awaiting.delete(modName);
    }
  }
}
export default plugin.add(new Loader());
