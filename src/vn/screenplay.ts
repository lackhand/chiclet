import Action from "../engine/action";
import Parser from "../engine/parser";
import { ActionLookup } from "../engine/plugin";
import { Key, Path } from "../util/objectPath";
import LRU from "../util/lru";
import Scene from "./scene";
import Executor from "../engine/executor";

export interface Props {
  scenes?: number;
  parser: Parser;
  getUrl?: (key: Key) => string;
  initial?: Scene[];
}

function defaultGetUrl(key: Key) {
  return `/story/${String(key)}.kdl`;
}
export default class Screenplay extends ActionLookup {
  private readonly _cache: LRU<Key, Scene>;
  getUrl: (key: Key) => string;
  parser: Parser;

  constructor(executor: Executor) {
    super();
    const {
      getUrl = defaultGetUrl,
      parser,
      scenes = 1000,
      initial = [],
    } = executor.props;
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
  private async first(key: Key): Promise<Scene> {
    console.log("attempting first", key);
    let result;
    if (!(result = this._cache.get(key))) {
      console.log("cache miss");
      const url = this.getUrl(key);
      console.log("Trying fetch of", url);
      const fetched = await fetch(url);
      console.log("fetched", fetched);
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
    console.log("returning the hit result", result);
    return result;
  }
  private async doGet(path: Path): Promise<Action> {
    console.log("Attempting get", path);
    if (path.length == 0) {
      console.error("Can't find empty path.");
      throw new Error();
    }
    const first = path[0];
    let ptr: Action = await this.first(first);
    if (!ptr) {
      console.error("No scene for", first, "(path)", path);
      throw new Error();
    }
    for (let i = 1; i < path.length; ++i) {
      const next = (await ptr.get(path[i])) as Action;
      if (!next) {
        console.error("No action at", path.slice(0, i), "!", path.slice(i));
        throw new Error();
      }
      ptr = next;
    }
    return ptr;
  }
  async get(path: Path): Promise<Action> {
    try {
      return await this.doGet(path);
    } catch (e) {
      console.error("Error at", path, e);
      throw e;
    }
  }
}
