import Action from "../engine/action";
import { Parser } from "../engine/parser";
import { ActionLookup } from "../engine/plugin";
import { Key, Path } from "../util/jpath";
import LRU from "../util/lru";
import Scene from "./scene";

export interface Props {
  scenes?: number;
  parser: Parser;
  getUrl?: (key: Key) => string;
  initial?: Scene[];
}

function defaultGetUrl(key: Key) {
  return `/story/${String(key)}.kdl`;
}
export default class Chapter extends ActionLookup {
  private readonly _cache: LRU<Key, Scene>;
  getUrl: (key: Key) => string;
  parser: Parser;

  constructor({
    getUrl = defaultGetUrl,
    parser,
    scenes = 1000,
    initial = [],
  }: Props) {
    super();
    this._cache = new LRU<Key, Scene>(scenes);
    this.getUrl = getUrl;
    this.parser = parser;
    for (let scene of initial) {
      this._cache.set(scene.name, scene);
    }
  }

  clear() {
    this._cache.clear();
  }
  async first(key: Key): Promise<Scene> {
    let result;
    if (!(result = this._cache.get(key))) {
      const url = new URL(this.getUrl(key));
      const fetched = await fetch(url);
      if (!fetched.ok) {
        console.error("Can't find", url, "for", key);
        throw new Error();
      }
      const text = await fetched.text();
      const scenes = this.parser.parseText(text, Scene.parse);
      for (let scene of scenes) {
        this._cache.set(scene.name, scene);
      }
    }
    if (!(result = this._cache.get(key))) {
      console.error("Parsed page for", key, "but still no scene!");
      throw new Error();
    }
    return result;
  }
  async get(path: Path): Promise<Action> {
    if (path.length == 0) {
      console.error("Can't find empty path.");
      throw new Error();
    }
    const first = path[0];
    const ptr = await this.first(first);
    if (!ptr) {
      console.error("No scene for", first, "(path)", path);
      throw new Error();
    }
    for (let i = 1; i < path.length; ++i) {
      const next = (await ptr.get(path[i])) as Action;
      if (!next) {
        console.error("No scene at", i, path[i], "(path)", path);
        throw new Error();
      }
    }
    return ptr;
  }
}
