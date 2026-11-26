import { defineConfig } from "drizzle-kit";

// Only the user database is migrated. The question bank (content-schema.ts)
// is a read-only asset built by scripts/build-content-db.mjs.
export default defineConfig({
  dialect: "sqlite",
  driver: "expo",
  schema: "./services/db/user-schema.ts",
  out: "./drizzle",
});
