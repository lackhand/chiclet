import Executor from "@/src/engine/executor";
import Parser from "@/src/engine/parser";
import { arr, last } from "@/src/util/objectPath";
import BaseStorage from "./baseStorage";

export default class Export extends BaseStorage {
  async run(executor: Executor) {
    const slot = executor.eval.string(this.slot, "auto");
    await executor.export(async (vars) => {
      const store = await this.getStore().catch((e) => {
        executor.pubsub.publish(ERRORS_DB, e);
        return Promise.reject(e);
      });

      const request = store.put(vars, slot);
      await new Promise((resolve, reject) => {
        request.onsuccess = resolve;
        request.onerror = reject;
      }).catch((e) => {
        executor.pubsub.publish([...ERRORS_SLOT, slot], e);
        return Promise.reject(e);
      });
      executor.pubsub.publish([...SAVE_SLOT, slot], true);
    });
  }
  static parse(parser: Parser): Export {
    return new Export(last(parser.values) ?? undefined);
  }
}

const ERRORS_DB = arr`save db error`;
const ERRORS_SLOT = arr`save slot error`;
const SAVE_SLOT = arr`save slot`;
