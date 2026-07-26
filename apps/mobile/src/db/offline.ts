import * as SQLite from 'expo-sqlite';
import type { SyncMutation } from '@iq/shared';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('iq_offline.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS outbox (
          id TEXT PRIMARY KEY NOT NULL,
          type TEXT NOT NULL,
          payload TEXT NOT NULL,
          client_updated_at TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS product_cache (
          id TEXT PRIMARY KEY NOT NULL,
          json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS stock_cache (
          id TEXT PRIMARY KEY NOT NULL,
          product_id TEXT NOT NULL,
          warehouse_id TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      return db;
    })();
  }
  return dbPromise;
}

export async function enqueueMutation(mutation: SyncMutation) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO outbox (id, type, payload, client_updated_at, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    mutation.clientMutationId,
    mutation.type,
    JSON.stringify(mutation.payload),
    mutation.clientUpdatedAt,
    new Date().toISOString(),
  );
}

export async function listOutbox(): Promise<SyncMutation[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    type: string;
    payload: string;
    client_updated_at: string;
  }>('SELECT * FROM outbox ORDER BY created_at ASC');
  return rows.map((r) => ({
    clientMutationId: r.id,
    type: r.type as SyncMutation['type'],
    payload: JSON.parse(r.payload) as Record<string, unknown>,
    clientUpdatedAt: r.client_updated_at,
  }));
}

export async function removeOutbox(ids: string[]) {
  if (!ids.length) return;
  const db = await getDb();
  for (const id of ids) {
    await db.runAsync('DELETE FROM outbox WHERE id = ?', id);
  }
}

export async function cacheProducts(
  products: Array<{ id: string; json: string; updatedAt: string }>,
) {
  const db = await getDb();
  for (const p of products) {
    await db.runAsync(
      `INSERT OR REPLACE INTO product_cache (id, json, updated_at) VALUES (?, ?, ?)`,
      p.id,
      p.json,
      p.updatedAt,
    );
  }
}

export async function readCachedProducts(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ json: string }>(
    'SELECT json FROM product_cache',
  );
  return rows.map((r) => r.json);
}

export async function cacheStock(
  levels: Array<{
    id: string;
    productId: string;
    warehouseId: string;
    quantity: number;
    updatedAt: string;
  }>,
) {
  const db = await getDb();
  for (const s of levels) {
    await db.runAsync(
      `INSERT OR REPLACE INTO stock_cache (id, product_id, warehouse_id, quantity, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      s.id,
      s.productId,
      s.warehouseId,
      s.quantity,
      s.updatedAt,
    );
  }
}
