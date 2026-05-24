// jest.config.js — Wave 0 (plan 01-01)
// Uses the jest-expo preset which configures the RN transformer + module map for
// Expo SDK 56. Tests live in /tests at the repo root.
module.exports = {
  preset: 'jest-expo',
  testPathIgnorePatterns: ['/node_modules/', '/.expo/', '/android/', '/ios/'],
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.test.tsx'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-firebase|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|firebase|@firebase))',
  ],
  setupFiles: [],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  // Force the Firebase JS SDK and its @firebase/* sub-packages to resolve to
  // their CommonJS builds in the Jest environment. Without this, jest-expo
  // resolves the `module`/`browser` field to dist/esm/*.esm.js whose untransformed
  // `export` syntax crashes Node before babel-preset-expo can transpile it
  // (plan 01-02 Rule-3 deviation — unblocks tests/firebase-config.test.ts).
  moduleNameMapper: {
    '^firebase/app$': '<rootDir>/tests/__mocks__/firebase-stub.js',
    '^firebase/auth$': '<rootDir>/tests/__mocks__/firebase-stub.js',
    '^firebase/firestore$': '<rootDir>/tests/__mocks__/firebase-stub.js',
  },
};
