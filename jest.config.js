/**
 * Logic and database tests run in plain Node (no React Native runtime):
 * the DB layer is exercised against the real content.db through
 * better-sqlite3, which has the same synchronous semantics as expo-sqlite.
 * @type {import('jest').Config}
 */
module.exports = {
  testEnvironment: "node",
  moduleNameMapper: {
    "\\.(png|jpe?g|webp|db)$": "<rootDir>/__tests__/__stubs__/asset.js",
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["<rootDir>/__tests__/**/*.test.ts"],
  transformIgnorePatterns: ["/node_modules/"],
};
