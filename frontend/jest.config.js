module.exports = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.tsx?$": "ts-jest",
    "node_modules/.+\\.jsx?$": ["ts-jest", {
      tsconfig: { allowJs: true },
      diagnostics: false,
    }],
  },
  transformIgnorePatterns: [
    "node_modules/(?!(@openedx/paragon|@openedx/paragon/icons)/)",
  ],
  moduleNameMapper: {
    "\\.(css|scss)$": "identity-obj-proxy",
  },
  setupFilesAfterEnv: ["./src/test/setup.ts"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/types.ts",
    "!src/**/index.tsx",
    "!src/test/**",
  ],
};
