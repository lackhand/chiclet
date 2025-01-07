import Trie from "@/src/util/trie";
import { SceneBeat } from "./beats";
import plugin from "./plugins";
import { err } from "../util/tags";
import unwrap from "../util/lazy";

type Module = any;
export class Loader {
  #loading = new Trie<Promise<any>>();
  #loaded = new Trie<any>();

  async load(path: string[], cb: () => Promise<any>): Promise<any> {
    const had = this.#loaded.get(...path);
    if (had) return had;
    const getting = this.#loading.get(...path);
    if (getting) return await getting;
    try {
      let result = await this.#loading.set(cb(), ...path);
      this.#loaded.set(result, ...path);
      return result;
    } finally {
      this.#loading.pop(...path);
    }
  }
  async storyModule(name: string): Promise<Module> {
    return await this.load(["story", name], async () => {
      // https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars#limitations
      let module =
        (await import(`../story/${name}.ts`)) ?? err`Missing module ${name}`;
      // This does not itself block!
      unwrap.or(module.onLoad);
      return module;
    });
  }
  async scene(modName: string, sceneName?: string): Promise<SceneBeat> {
    sceneName ??= "default";
    return await this.load(["story", modName, sceneName], async () => {
      let mod = await this.storyModule(modName);
      let scene = (await unwrap(mod[sceneName])) as SceneBeat;
      unwrap.or(scene?.onLoad);
      return scene;
    });
  }
}
export default plugin.add(new Loader());
