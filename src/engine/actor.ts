import unwrap, { Source, SourceObject } from "@/src/util/lazy";
import plugin from "./plugins";
import type { At } from "./stage";
import { all, Beat, Beats } from "./beats";
import Signal from "../util/signal";
import exec, { Key } from "./exec";

export type Is = string;
export interface Tween {}
export interface AudioObject {
  src: string;
  type?: string;
  loop?: boolean;
}
export type AudioKey = string;
export type Audio = AudioObject | AudioKey;

export type Actor = {
  key: Key;
  actedOn: number;
  mutatedOn: number;
  name: string;
  tell: string;

  is?: Is;
  at?: At;
  audio?: Audio;
  tween?: Tween;
  [k: string]: any;
};
export type ActorDelta = Partial<SourceObject<Actor>> & {
  if?: Source<boolean>;
  do?: () => void;

  key?: never;
  actedOn?: never;
  mutatedOn?: never;
};
export type Delta = Source<ActorDelta | string>;
export class Actors {
  #cast = new Map<Key, Actor>();
  #fg: Key = "";

  get fg() {
    return this.get(this.#fg);
  }

  readonly onNew = new Signal<[Key]>("newActor").bridgeTo(Signal.INFO);
  readonly onAct = new Signal<[Actor]>("actorActing").bridgeTo(Signal.INFO);
  readonly onReflectiveMutation = new Signal<
    [key: Key, prop: string, old: any, _new: any]
  >("reflectiveMutation").bridgeTo(Signal.INFO);
  readonly onFG = new Signal<[Actor]>("fg").bridgeTo(Signal.DEBUG);

  get(key: Key): Actor {
    let prev = this.#cast.get(key);
    if (prev) {
      return prev;
    }
    prev = {
      key,
      name: key?.toString() ?? "",
      actedOn: exec.count,
      mutatedOn: exec.count,
      tell: "",
    };
    this.#cast.set(key, prev);
    this.onNew.notify(key);
    return prev;
  }
  #set(key: Key, actor: Actor, delta: undefined | Partial<Actor>): Actor {
    if (delta) {
      actor = { ...actor, ...delta };
      this.onAct.notify(actor);
      this.#cast.set(key, actor);
      if (delta.tell) {
        this.#fg = key;
        this.onFG.notify(actor);
      }
    }
    return actor;
  }
  mutateField(key: Key, field: string, newValue: any) {
    let actor = this.get(key);
    const oldValue = (actor as any)[field];
    (actor as any)[field] = newValue;
    actor.mutatedOn = exec.count;
    this.onReflectiveMutation.notify(key, field, oldValue, newValue);
  }
  *filter(predicate: (actor: Actor, key: Key) => any): Generator<Actor> {
    for (let [key, actor] of this.#cast) {
      if (predicate(actor, key)) yield actor;
    }
  }

  act(key: Key, origDelta: Delta): void {
    const actor = this.get(key);
    // We don't usually do this, but if we thunked the actor update itself -- dynamic keys? -- eval that now.
    let delta = unwrap(origDelta);
    if (delta === undefined) return;
    // Maybe: it's just a tell command. Do it.
    if ("string" === typeof delta) {
      this.#set(key, actor, {
        actedOn: exec.count,
        mutatedOn: exec.count,
        tell: delta,
      });
      return;
    }
    if (delta.key) throw new Error("You can't update an actors key (try name)");
    // If we had an "if" guard, discard if it unwraps to -- specifically -- false.
    if (false === unwrap.or(delta["if"])) return;

    // Make a copy so we can dynamically evaluate things.
    if (delta === origDelta) {
      delta = { ...delta };
    }
    // Remove keys we don't persist.
    delete delta["key"];
    delete delta["if"];

    delete delta["actedOn"];
    delete delta["mutatedOn"];
    (delta as Actor).actedOn = exec.count;
    (delta as Actor).mutatedOn = exec.count;

    for (let [k, v] of Object.entries(delta)) {
      let value = unwrap(v);
      if (value === undefined) {
        delete (delta as any)[k];
      } else {
        (delta as any)[k] = value;
      }
    }
    delete delta["do"];
    this.#set(key, actor, delta as Partial<Actor>);
  }

  import(input: any) {
    this.#cast.clear();
    if (input?.actors?.cast) {
      for (let [k, v] of Object.entries(input?.actors?.cast)) {
        this.#cast.set(k, v as any);
      }
    }
    this.#fg = input?.actors?.fg ?? "";
  }
  export(): object {
    return { cast: Object.fromEntries(this.#cast), fg: this.#fg };
  }
}
const actors = plugin.add(new Actors());

export interface BeatFactory {
  (...updates: Delta[]): Beats;
}

/**
 * Creates a new character to be used within the game.
 *
 * Note the `tell` action usually lives under each individual actor instance.
 * So it somewhat unusually gets preregistered as:
 *     const someChara = actor('someChara');
 *     export const someScene = scene(  // or even better: preload({someChara: {angry: ..., default: ...}},
 *       someChara({is: "angry", tell: "some static text"}),  // or tell: () => `some${dynamic}`...
 *       someChara(() => `I am dynamically ${someChara.name}!`)  // still angry, because someChara is stateful
 *     )
 */
/// Sneaky sneaky!
/// This _is_ the act as a beat factory.
/// However, it's _also_ the scratch space for the actor's variables.
export default function actor(key: Key): BeatFactory & Actor {
  const beatFactory = (...deltas: Delta[]): Beat => {
    return all(
      ...deltas.map((delta) => ({ do: () => actors.act(key, delta) }))
    );
  };
  return new Proxy(beatFactory, {
    get: (_target, prop) => {
      let actor = actors.get(key);
      return Reflect.get(actor, prop);
    },
    set: (_target, prop, value) => {
      if ("symbol" === typeof prop) return false;
      actors.mutateField(key, prop, value);
      return true;
    },
  }) as BeatFactory & Actor;
}
actor.plugin = actors;
// Special reserved always-present narrator actor.
// By convention, used as the background.
actor.default = actor("");
