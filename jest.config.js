/**
 * Logic and database tests run in plain Node (no React Native runtime):
 * the DB layer is exercised against the real content.db through
 * better-sqlite3, which has the same synchronous semantics as expo-sqlite.
 * @type {import('jest').Config}
 */
module.exports = {
  testEnvironment: "node",
  globals: { __DEV__: false },
  moduleNameMapper: {
    "\\.(png|jpe?g|webp|db)$": "<rootDir>/__tests__/__stubs__/asset.js",
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["<rootDir>/__tests__/**/*.test.{ts,tsx}"],
  // expo-sqlite ships ESM; it is compiled so its real provider can be tested.
  transformIgnorePatterns: ["/node_modules/(?!expo-sqlite/)"],
};
