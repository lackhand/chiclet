import { Path } from "../util/objectPath";
import Action from "./action";
import Executor from "./executor";
import { Value } from "./parser";

export interface Plugin {}
export type Serialization = Record<string, any>;
export interface SerializablePlugin {
  export(into: Serialization): void;
  import(from: Serialization): void;
}
export function isSerializablePlugin(s: Plugin): s is SerializablePlugin {
  let cast = s as SerializablePlugin;
  return cast.export !== undefined && cast.import !== undefined;
}
// Might be abstract, so we let ourselves ignore that...
export type PluginClass<T extends Plugin = Plugin> = Function & {
  prototype: T;
};
export interface PluginConstructor<T extends Plugin = Plugin>
  extends PluginClass<T> {
  new (t: Executor): T;
}
export type PluginSource<T extends Plugin = Plugin> = T | PluginConstructor<T>;

export abstract class Pubsub implements Plugin {
  publish(_topic: Path, _event: any) {
    throw new Error("Method not implemented.");
  }
  subscribe(
    _topic: Path,
    _handler: (path: Path, event: any) => void
  ): () => void {
    throw new Error("Method not implemented.");
  }
  unsubscribe(_topic: Path, _handler: (path: Path, event: any) => void) {
    throw new Error("Method not implemented.");
  }
}
export abstract class ActionLookup<T = Action> implements Plugin {
  async get(_path: Path): Promise<T> {
    throw new Error("Method not implemented.");
  }
}
type EvalIn = undefined | null | Value;
export abstract class Evaluator implements SerializablePlugin {
  export(_into: Serialization): void {
    throw new Error("Method not implemented.");
  }
  import(_from: Serialization): void {
    throw new Error("Method not implemented.");
  }
  abstract boolean(text: EvalIn, _default?: boolean): boolean;
  abstract number(text: EvalIn, _default?: number): number;
  abstract string(text: EvalIn, _default?: string): string;
  abstract eval(text: EvalIn, _default?: any): any;
  abstract vars: any;
}
export type RequiredPlugins = [
  PluginSource<Pubsub>,
  PluginSource<ActionLookup>,
  PluginSource<Evaluator>,
  ...PluginSource[]
];
