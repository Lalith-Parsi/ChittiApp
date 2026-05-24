// tests/__mocks__/firebase-stub.js — plan 01-02 Rule-3 deviation.
//
// The Firebase JS SDK ships dist/esm/*.esm.js entry points that crash Node
// with "Unexpected token 'export'" because babel-preset-expo via jest-expo
// doesn't reliably transpile every nested @firebase/* package in time. For
// the DATA-04 config-loader test the SDK APIs aren't actually exercised —
// readConfig() throws before any Firebase call — so we stub the three SDK
// surfaces firebase.ts imports. Real device builds use the unmocked SDK
// via Metro (which has no ESM issue).
//
// If a future test legitimately needs to exercise getApps / getAuth /
// getFirestore behavior, replace this stub with proper jest.mock() inside
// that test.
module.exports = {
  __esModule: true,
  initializeApp: () => ({ name: 'stub' }),
  getApps: () => [],
  getAuth: () => ({}),
  getFirestore: () => ({}),
};
