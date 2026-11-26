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
 * Opens the user DB, attaches the question bank and runs migrations exactly
 * once. Suspends until ready, so everything below can assume a working DB.
 */
export function DatabaseProvider({ children }: { children: ReactNode }) {
  return (
    <SQLiteProvider
      databaseName={USER_DB_NAME}
      options={{ enableChangeListener: true }}
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
