import Dexie, { type Table } from "dexie";

export type SyncItem = { id?: number; entity: string; action: "create" | "update"; payload: unknown; createdAt: string };

class GblDatabase extends Dexie {
  syncQueue!: Table<SyncItem, number>;
  constructor() {
    super("gbl-mobile-health");
    this.version(1).stores({ syncQueue: "++id, entity, createdAt" });
  }
}

export const db = new GblDatabase();
