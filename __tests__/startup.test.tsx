/**
 * @jest-environment jsdom
 *
 * Regression test for the app never leaving the splash screen: the database
 * provider must open the database once and render its children, using the
 * real expo-sqlite SQLiteProvider (only the native layer is stubbed).
 */
import { act, Suspense } from "react";
import { createRoot } from "react-dom/client";

const opened: string[] = [];
const closed: string[] = [];

jest.mock("expo-asset", () => ({ Asset: { fromModule: jest.fn() } }));
jest.mock("../node_modules/expo-sqlite/build/ExpoSQLite", () => ({
  __esModule: true,
  default: {},
}));
jest.mock("../node_modules/expo-sqlite/build/SQLiteDatabase", () => ({
  openDatabaseAsync: async (name: string) => {
    opened.push(name);
    await new Promise((resolve) => setTimeout(resolve, 10));
    return { databasePath: `/db/${name}`, closeAsync: async () => void closed.push(name) };
  },
}));
// The app imports from "expo-sqlite"; serve the real provider implementation.
jest.mock("expo-sqlite", () => jest.requireActual("../node_modules/expo-sqlite/build/hooks"));
jest.mock("@/services/db/client", () => ({
  USER_DB_NAME: "user.db",
  initDatabase: jest.fn(async () => {}),
  createDb: (sqlite: unknown) => ({ sqlite }),
}));

import { initDatabase } from "@/services/db/client";
import { DatabaseProvider, useDb } from "@/services/db/DatabaseProvider";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Ready() {
  useDb();
  return <span>ready</span>;
}

it("opens the database once and renders the app", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <Suspense fallback={<span>loading</span>}>
        <DatabaseProvider>
          <Ready />
        </DatabaseProvider>
      </Suspense>,
    );
  });
  // Give a reopen loop, if any, time to show itself.
  await act(() => new Promise((resolve) => setTimeout(resolve, 300)));

  expect(container.textContent).toBe("ready");
  expect(opened).toEqual(["user.db"]);
  expect(closed).toEqual([]);
  expect(initDatabase).toHaveBeenCalledTimes(1);
  act(() => root.unmount());
});
