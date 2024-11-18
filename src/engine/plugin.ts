import { Path } from "../util/jpath";
import Action from "./action";
import Executor, { Dollar } from "./executor";

export interface Plugin {
  export(into: Dollar): void;
  import(from: Dollar): void;
}
export type PluginClass<T extends Plugin = Plugin> = Function & {
  prototype: T;
};
export interface PluginConstructor<T extends Plugin = Plugin>
  extends PluginClass<T> {
  new (t: Executor): T;
}
export type PluginSource<T extends Plugin = Plugin> = T | PluginConstructor<T>;
export type Topic = string;

export abstract class Pubsub implements Plugin {
  publish(_topic: Topic, _event: any) {
    throw new Error("Method not implemented.");
  }
  export(_into: Dollar): void {}
  import(_from: Dollar): void {}
}
export abstract class ActionLookup<T = Action> implements Plugin {
  async get(_path: Path): Promise<T> {
    throw new Error("Method not implemented.");
  }
  export(_into: Dollar): void {}
  import(_from: Dollar): void {}
}
export type RequiredPlugins = [
  PluginConstructor<Pubsub>,
  PluginConstructor<ActionLookup>,
  ...PluginConstructor[]
];
