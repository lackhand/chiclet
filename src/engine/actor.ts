import unwrap, { Source, SourceObject } from "@/src/util/lazy";
import plugin from "./plugins";
import type { At } from "./stage";
import { all, Beats } from "./beats";
import Signal from "../util/signal";
import { Key } from "./exec";

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
  name?: string;
  is?: Is;
  at?: At;
  audio?: Audio;
  tween?: Tween;
};
export type ActorDelta = Partial<SourceObject<Actor>> & {
  if?: Source<boolean>;
  tell?: Source<string>;
};
export type Delta = Source<ActorDelta | string>;

export class Actors {
  #cast = new Map<Key, Actor>();
  readonly onNew = new Signal("newActor").bridgeTo(Signal.INFO);
  readonly onChange = new Signal("actor").bridgeTo(Signal.INFO);
  readonly onTell = new Signal("tell").bridgeTo(Signal.INFO);

  get(key: Key): Actor {
    let prev = this.#cast.get(key);
    if (prev) {
      return prev;
    }
    prev = { key, name: key?.toString() ?? "" };
    this.#cast.set(key, prev);
    this.onNew.notify(key);
    return prev;
  }
  #set(
    key: Key,
    actor: Actor,
    delta: undefined | Partial<Actor>,
    text: Source<undefined | string>
  ): Actor {
    if (delta) {
      actor = { ...actor, ...delta };
      this.onChange.notify(key);
      this.#cast.set(key, actor);
    }
    text = unwrap(text);
    this.onTell.notify(key, text);
    return actor;
  }
  *filter(predicate: (actor: Actor, key: Key) => any): Generator<Actor> {
    for (let [key, actor] of this.#cast) {
      if (predicate(actor, key)) yield actor;
    }
  }

  // If `delta` is undefined, skip.
  // If `delta` is a closure, call it.
  act(key: Key, origDelta: Delta): void {
    const actor = this.get(key);
    // We don't usually do this, but if we thunked the actor update itself -- dynamic keys? -- eval that now.
    let delta = unwrap(origDelta);
    if (delta === undefined) return;
    // Maybe: it's just a text command. Do it.
    if ("string" === typeof delta) {
      this.#set(key, actor, undefined, delta);
      return;
    }
    if (delta.key) throw new Error("You can't update an actors key (try name)");
    // If we had an "if" guard, discard if it unwraps to -- specifically -- false.
    if (false === unwrap.or(delta["if"])) return;

    // Make a copy so we can dynamically evaluate things.
    if (delta === origDelta) {
      delta = { ...delta };
    }
    // ... and extract the tell (, if any)...
    const tell = delta["tell"] as Source<undefined | string>;
    // Remove keys we don't persist.
    delete delta["key"];
    delete delta["if"];
    delete delta["tell"];
    for (let [k, v] of Object.entries(delta)) {
      let value = unwrap(v);
      if (value === undefined) {
        delete (delta as any)[k];
      } else {
        (delta as any)[k] = value;
      }
    }
    this.#set(key, actor, delta as Partial<Actor>, tell);
  }

  import(input: any) {
    this.#cast.clear();
    if (input?.actors?.cast) {
      for (let [k, v] of Object.entries(input?.actors?.cast)) {
        this.#cast.set(k, v as any);
      }
    }
  }
  export(): object {
    return { cast: Object.fromEntries(this.#cast) };
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
  const beatFactory = (...deltas: Delta[]): Beats => {
    return all(
      ...deltas.map((delta) => ({
        do() {
          actors.act(key, delta);
        },
      }))
    );
  };
  return new Proxy(beatFactory, {
    get: (_target, prop) => {
      let actor = actors.get(key);
      return Reflect.get(actor, prop);
    },
    set: (_target, prop, value) => {
      let actor = actors.get(key);
      return Reflect.set(actor, prop, value);
    },
  }) as BeatFactory & Actor;
}
actor.plugin = actors;
// Special reserved narrator actor.
actor.nil = actor("");
