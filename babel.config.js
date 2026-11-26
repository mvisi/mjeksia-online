module.exports = function (api) {
  // Jest runs in plain Node/jsdom: NativeWind's JSX runtime needs React Native,
  // so tests use React's own runtime (tests do not exercise styling).
  const isTest = api.env("test");
  return {
    presets: isTest
      ? [["babel-preset-expo", { jsxImportSource: "react" }]]
      : [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
    plugins: [["inline-import", { extensions: [".sql"] }]],
  };
};
