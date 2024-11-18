import Executor from "@/src/engine/executor";
import { Parser } from "@/src/engine/parser";
import { last } from "@/src/util/jpath";
import BaseStorage from "./baseStorage";

export default class Import extends BaseStorage {
  static parse(parser: Parser): Import {
    return new Import(parser.compileText(last(parser.values) ?? undefined));
  }

  async run(manager: Executor) {
    const slot = this.slot?.(manager) ?? "auto";
    const store = await this.getStore().catch((e) => {
      manager.pubsub.publish("errors.load.db", e);
      return Promise.reject(e);
    });

    const request = store.get(slot);
    const vars: object = await new Promise<any>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = reject;
    }).catch((e) => {
      manager.pubsub.publish(`errors.load.slot.${slot}`, e);
      return Promise.reject(e);
    });

    manager.pubsub.publish(`engine.resetting`, vars);
    manager.import(vars);
    manager.pubsub.publish(`load.slot.${slot}`, true);
  }
}
