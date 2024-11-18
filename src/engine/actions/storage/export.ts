import Executor from "@/src/engine/executor";
import { Parser } from "@/src/engine/parser";
import { last } from "@/src/util/jpath";
import BaseStorage from "./baseStorage";
import Pubsub from "@/src/util/pubsub";

export default class Export extends BaseStorage {
  async run(executor: Executor) {
    const slot = this.slot?.(executor) ?? "auto";
    await executor.export(async (vars) => {
      const store = await this.getStore().catch((e) => {
        executor.plugin(Pubsub).publish("errors.save.db", e);
        return Promise.reject(e);
      });

      const request = store.put(vars, slot);
      await new Promise((resolve, reject) => {
        request.onsuccess = resolve;
        request.onerror = reject;
      }).catch((e) => {
        executor.plugin(Pubsub).publish(`errors.save.slot.${slot}`, e);
        return Promise.reject(e);
      });
      executor.plugin(Pubsub).publish(`save.slot.${slot}`, true);
    });
  }
  static parse(parser: Parser): Export {
    return new Export(parser.compileText(last(parser.values) ?? undefined));
  }
}
