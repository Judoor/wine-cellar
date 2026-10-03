import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export const DATA_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR ?? "./data");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

type DB = BetterSQLite3Database<typeof schema>;

// Reuse the connection across hot reloads in development.
const globalForDb = globalThis as unknown as { __db?: DB };

function createDb(): DB {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const sqlite = new Database(path.join(DATA_DIR, "winecellar.db"));
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(/*turbopackIgnore: true*/ process.cwd(), "drizzle") });
  return db;
}

export function getDb(): DB {
  globalForDb.__db ??= createDb();
  return globalForDb.__db;
}

export { schema };
