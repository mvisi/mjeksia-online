import { CONTENT_VERSION } from "@/constants/content-version";
import { drizzle, type ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import {
  deleteDatabaseAsync,
  importDatabaseFromAssetAsync,
  type SQLiteDatabase,
} from "expo-sqlite";
import Storage from "expo-sqlite/kv-store";
import migrations from "../../drizzle/migrations";
import * as schema from "./schema";

export type Db = ExpoSQLiteDatabase<typeof schema> & {
  $client: SQLiteDatabase;
};

export const USER_DB_NAME = "user.db";
const CONTENT_DB_NAME = `content-${CONTENT_VERSION}.db`;
const CONTENT_DB_KEY = "content_db_name";

export function createDb(sqlite: SQLiteDatabase): Db {
  return drizzle(sqlite, { schema });
}

/**
 * Runs once, before anything renders (SQLiteProvider `onInit`):
 * 1. copies the bundled question bank next to the user DB. The file name
 *    contains the content hash, so a new app version with updated questions
 *    gets a fresh copy while the user's history is untouched;
 * 2. ATTACHes it, so content tables can be queried (and joined) as if they
 *    were local;
 * 3. runs the user DB migrations.
 */
export async function initDatabase(sqlite: SQLiteDatabase) {
  await importDatabaseFromAssetAsync(CONTENT_DB_NAME, {
    assetId: require("@/assets/content.db"),
  });

  const previous = Storage.getItemSync(CONTENT_DB_KEY);
  if (previous && previous !== CONTENT_DB_NAME) {
    await deleteDatabaseAsync(previous).catch(() => undefined);
  }
  Storage.setItemSync(CONTENT_DB_KEY, CONTENT_DB_NAME);

  const directory = sqlite.databasePath.slice(0, sqlite.databasePath.lastIndexOf("/") + 1);
  await sqlite.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  await sqlite.runAsync("ATTACH DATABASE ? AS content", [directory + CONTENT_DB_NAME]);

  await migrate(createDb(sqlite), migrations);
}
