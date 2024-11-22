import Executor from "@/src/engine/executor";
import Parser from "@/src/engine/parser";
import { arr, last } from "@/src/util/objectPath";
import BaseStorage from "./baseStorage";

export default class Import extends BaseStorage {
  static parse(parser: Parser): Import {
    return new Import(last(parser.values) ?? undefined);
  }

  async run(manager: Executor) {
    const pubsub = manager.pubsub;
    const slot = manager.eval.string(this.slot, "auto");
    const store = await this.getStore().catch((e) => {
      pubsub.publish(ERRORS_DB, e);
      return Promise.reject(e);
    });

    const request = store.get(slot);
    const vars: object = await new Promise<any>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = reject;
    }).catch((e) => {
      pubsub.publish([...ERRORS_SLOT, slot], e);
      return Promise.reject(e);
    });

    pubsub.publish(ENGINE_RESETTING, vars);
    manager.import(vars);
    pubsub.publish([...LOADED_SLOT, slot], true);
  }
}

const ERRORS_DB = arr`errors load db`;
const ERRORS_SLOT = arr`errors load slot`;
const ENGINE_RESETTING = arr`engine resetting`;
const LOADED_SLOT = arr`load slot`;
