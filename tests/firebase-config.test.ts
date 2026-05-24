// TODO(plan-01-02): wire when implementation lands
//
// RED-by-default scaffold. Plan 01-02 rewrites src/lib/firebase.ts to read
// from Constants.expoConfig.extra.firebase and throw on missing keys. Today,
// firebase.ts hardcodes the config and exports `auth`/`db` directly — this
// test will RED until the rewrite.

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: {} } },
}));

describe('firebase config loader (DATA-04)', () => {
  it('throws "Firebase config missing" when extra.firebase is absent', () => {
    expect(() => {
      // readConfig is not yet exported; importing the rewritten module
      // with empty expoConfig.extra MUST throw a "Firebase config missing"
      // Error at module-eval time (or via readConfig() helper).
      const mod = require('../src/lib/firebase');
      // Touch the export to force evaluation in case it lazy-loads.
      void mod.db;
    }).toThrow(/Firebase config missing/);
  });
});
