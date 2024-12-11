import protoChain from "@/src/util/protoChain";

export interface Plugin extends Object {
  import?(source: object): void;
  export?(): undefined | object;
}

interface Ctor<T = any> {
  new (...params: any[]): T;
}

export class Plugins {
  #registry = new Map<Ctor, Plugin>();
  #instances = [] as Plugin[];

  public get plugins(): Readonly<Plugin[]> {
    return this.#instances;
  }

  public add(...plugins: Plugin[]): void {
    nextplugin: for (let plugin of plugins) {
      if (this.#instances.includes(plugin)) {
        console.warn("Duplicate plugin instance", plugin);
        continue nextplugin;
      }
      let classes = [...protoChain(plugin)];
      {
        let first = classes.shift();
        if (!first) {
          console.warn("somehow instance without ctor", first, classes, plugin);
          continue nextplugin;
        }
        let had = this.#registry.get(first as Ctor);
        if (had) {
          console.warn("Duplicate plugin for initial ctor", first, had, plugin);
          continue nextplugin;
        }
      }
      for (let clazz of classes) {
        this.#registry.set(clazz as Ctor, plugin);
      }
      this.#instances.push(plugin);
    }
  }
  public get<T extends Plugin>(ctor: Ctor<T>): T {
    let instance = this.#registry.get(ctor);
    if (!instance) {
      console.error("Requested unsatisfiable");
    }
    return instance as T;
  }
  public forEach(cb: (plugin: Plugin) => void): void {
    this.#instances.forEach(cb);
  }
}
const plugins = new Plugins();

export default function plugin<T extends Plugin>(ctor: Ctor<T>): T {
  return plugins.get(ctor);
}
plugin.engine = () => plugins;
plugin.add = <T extends Plugin>(plugin: T): T => (plugins.add(plugin), plugin);

(window as any).chiclet = plugin;
