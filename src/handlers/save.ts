import Executor from "../engine/executor";
import { Parser } from "../engine/parser";
import { last } from "../util/jpath";
import BaseStorage from "./baseStorage";

export default class Save extends BaseStorage {
  async run(executor: Executor) {
    const slot = this.slot?.(executor) ?? "auto";
    await executor.export(async (vars) => {
      const store = await this.getStore().catch((e) => {
        executor.pubsub.publish("errors.save.db", e);
        return Promise.reject(e);
      });

      const request = store.put(vars, slot);
      await new Promise((resolve, reject) => {
        request.onsuccess = resolve;
        request.onerror = reject;
      }).catch((e) => {
        executor.pubsub.publish(`errors.save.slot.${slot}`, e);
        return Promise.reject(e);
      });
      executor.pubsub.publish(`save.slot.${slot}`, true);
    });
  }
  static parse(parser: Parser): Save {
    return new Save(parser.compileText(last(parser.values) ?? undefined));
  }
}
