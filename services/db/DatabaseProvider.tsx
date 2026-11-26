import { createContext, use, useMemo, type ReactNode } from "react";
import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";
import { createDb, initDatabase, USER_DB_NAME, type Db } from "./client";

const DbContext = createContext<Db | null>(null);

/** Dev-only DB inspector (Expo dev tools → Drizzle Studio). */
function DrizzleStudio() {
  const sqlite = useSQLiteContext();
  const { useDrizzleStudio } =
    require("expo-drizzle-studio-plugin") as typeof import("expo-drizzle-studio-plugin");
  useDrizzleStudio(sqlite);
  return null;
}

function DrizzleBridge({ children }: { children: ReactNode }) {
  const sqlite = useSQLiteContext();
  const db = useMemo(() => createDb(sqlite), [sqlite]);

  return (
    <DbContext value={db}>
      {__DEV__ && <DrizzleStudio />}
      {children}
    </DbContext>
  );
}

/**
 * Must be a module-level constant. In suspense mode expo-sqlite reuses the
 * pending open only while `options` and `onInit` are the *same objects*.
 * This provider re-renders from scratch each time it suspends, so an inline
 * `{ … }` literal made every retry close the DB and open it again: an
 * endless loop that kept the splash screen up forever.
 */
const OPEN_OPTIONS = { enableChangeListener: true } as const;

/**
 * Opens the user DB, attaches the question bank and runs migrations exactly
 * once. Suspends until ready, so everything below can assume a working DB.
 */
export function DatabaseProvider({ children }: { children: ReactNode }) {
  return (
    <SQLiteProvider
      databaseName={USER_DB_NAME}
      options={OPEN_OPTIONS}
      onInit={initDatabase}
      useSuspense
    >
      <DrizzleBridge>{children}</DrizzleBridge>
    </SQLiteProvider>
  );
}

export function useDb(): Db {
  const db = use(DbContext);
  if (!db) throw new Error("useDb must be used inside <DatabaseProvider>");
  return db;
}
