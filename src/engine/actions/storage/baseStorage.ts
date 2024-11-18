import Action from "@/src/engine/action";
import { Get } from "@/src/engine/parser";

export default abstract class BaseStorage extends Action {
  slot: undefined | Get<string>;
  constructor(slot: undefined | Get<string>) {
    super();
    this.slot = slot;
  }
  protected getStore(
    dbName: string = "saves",
    storeName: string = "saves"
  ): Promise<IDBObjectStore> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName, 1);
      req.onerror = reject;
      req.onupgradeneeded = (_event) => {
        // Save the IDBDatabase interface
        const db: IDBDatabase = req.result;
        db.onerror = reject;
        // Create an objectStore for this database
        db.createObjectStore(storeName);
      };
      req.onsuccess = (_event) => {
        const db: IDBDatabase = req.result;
        db.onerror = reject;
        const transaction = db.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);
        resolve(store);
      };
    });
  }
}
