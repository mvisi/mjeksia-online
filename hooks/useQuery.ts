import { useDb } from "@/services/db/DatabaseProvider";
import type { Db } from "@/services/db/client";
import { addDatabaseChangeListener } from "expo-sqlite";
import { useEffect, useEffectEvent, useState } from "react";

/** Tables written by the app. Content tables never change at runtime. */
const USER_TABLES = ["answers", "test_sessions"];

type QueryState<T> =
  | { status: "loading"; data: undefined; error: undefined }
  | { status: "success"; data: T; error: undefined }
  | { status: "error"; data: undefined; error: Error };

/**
 * Runs an async DB query and keeps it fresh: it re-runs when `deps` change and
 * whenever one of `tables` is written to (debounced, so a 50-row transaction
 * triggers one refetch). Use `live: false` for static content queries.
 */
export function useQuery<T>(
  query: (db: Db) => T | Promise<T>,
  deps: readonly unknown[],
  { live = true, tables = USER_TABLES }: { live?: boolean; tables?: string[] } = {},
) {
  const db = useDb();
  const [state, setState] = useState<QueryState<T>>({
    status: "loading",
    data: undefined,
    error: undefined,
  });
  const [version, setVersion] = useState(0);

  const run = useEffectEvent(() => query(db));

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => run())
      .then(
        (data) => {
          if (!cancelled) setState({ status: "success", data, error: undefined });
        },
        (error: unknown) => {
          if (cancelled) return;
          console.error("Query failed", error);
          setState({
            status: "error",
            data: undefined,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        },
      );
    return () => {
      cancelled = true;
    };
    // `deps` is the caller's dependency list, like useEffect's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, version, ...deps]);

  const tableKey = tables.join(",");
  useEffect(() => {
    if (!live) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const watched = new Set(tableKey.split(","));
    const subscription = addDatabaseChangeListener(({ tableName }) => {
      if (!watched.has(tableName)) return;
      clearTimeout(timer);
      timer = setTimeout(() => setVersion((v) => v + 1), 60);
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [live, tableKey]);

  return {
    ...state,
    isLoading: state.status === "loading",
    refetch: () => setVersion((v) => v + 1),
  };
}
