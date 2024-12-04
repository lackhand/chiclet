import { State } from "@/src/util/values";
import unwrap, { Source, SourceObject } from "@/src/util/lazy";
import plugin from "./plugins";
import tell from "./tell";
import { all, Beats } from "./beats";
import Signal from "../util/signal";

export type Name = string;
export type Actor = State & {
  name: string;
  display?: string;
};
export type Delta = Source<Partial<SourceObject<Actor>> | string | string[]>;

export class Actors {
  #cast = new Map<Name, Actor>();
  readonly onNew = new Signal("newActor").bridgeTo(Signal.INFO);
  readonly onChange = new Signal("actor").bridgeTo(Signal.INFO);

  get(name: Name): Actor {
    let prev = this.#cast.get(name);
    if (prev) {
      return prev;
    }
    prev = { name, display: name };
    this.#cast.set(name, prev);
    this.onNew.notify(name);
    return prev;
  }
  #set(
    name: Name,
    actor: Actor,
    update: Partial<Actor>,
    texts: string[]
  ): Actor {
    const next = { ...actor, ...update } as Actor;
    this.onChange.notify(name);
    this.#cast.set(name, next);
    tell.tell(actor, update, texts);
    return next;
  }
  *filter(predicate: (actor: Actor, name: Name) => any): Iterator<Name> {
    for (let [name, actor] of this.#cast) {
      if (predicate(actor, name)) yield name;
    }
  }

  // If `delta` is undefined, skip.
  // If `delta` is an object with
  act(name: Name, delta: Delta): void {
    const actor = this.get(name);
    let update = {};
    let texts: string[] = [];
    delta = unwrap(delta);
    if (!delta) return;
    if ("string" === typeof delta) {
      if (delta) texts.push(delta);
    } else if (Array.isArray(delta)) {
      texts.push(...delta.filter(Boolean));
    } else {
      if (delta["if"] === false) return;
      delete delta["if"];
      const tell = delta["tell"];
      delete delta["tell"];
      if ("string" === typeof tell) {
        if (tell) texts.push(tell);
      } else if (Array.isArray(tell)) {
        texts.push(...(tell.filter(Boolean) as string[]));
      }
      Object.assign(update, delta);
    }
    this.#set(name, actor, update, texts);
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
/// Sneaky sneaky!
/// This _is_ the act as a beat factory.
/// However, it's _also_ the scratch space for the actor's variables.
export default function actor(name: Name): BeatFactory & Actor {
  const beatFactory = (...deltas: Delta[]): Beats => {
    return all(
      ...deltas.map((delta) => ({
        do() {
          actors.act(name, delta);
        },
      }))
    );
  };
  return new Proxy(beatFactory, {
    get: (_target, prop) => {
      let actor = actors.get(name);
      return Reflect.get(actor, prop);
    },
    set: (_target, prop, value) => {
      let actor = actors.get(name);
      return Reflect.set(actor, prop, value);
    },
  }) as BeatFactory & Actor;
}
actor.plugin = actors;
// Special reserved narrator actor.
actor.nil = actor("");
