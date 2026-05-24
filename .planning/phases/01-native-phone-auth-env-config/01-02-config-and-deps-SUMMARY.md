---
phase: 01-native-phone-auth-env-config
plan: 02-config-and-deps
subsystem: env-config + native-deps
tags: [firebase, rnfirebase, expo-config, env, eas, data-04, STUBBED]
dependency_graph:
  requires:
    - "01-01 (test infra: jest preset, RED scaffold tests/firebase-config.test.ts)"
  provides:
    - "app.config.ts (single Expo config source; reads EXPO_PUBLIC_FIREBASE_* into extra.firebase)"
    - "RNFirebase config plugins registered (@react-native-firebase/app + /auth) — Plan 01-04 can compile against this shape"
    - "src/lib/firebase.ts readConfig() loader (throws loudly on missing config)"
    - ".env (gitignored, real chitti-app-edfb1 values) + .env.example (committed placeholder)"
    - "DATA-04 unit-test gate GREEN"
  affects:
    - "package.json (5 runtime + 1 dev dep)"
    - "app.json (deleted)"
    - "src/lib/firebase.ts (rewritten)"
    - ".gitignore (.env now ignored)"
tech-stack:
  added:
    - "@react-native-firebase/app ^24.0.0"
    - "@react-native-firebase/auth ^24.0.0"
    - "expo-dev-client ~56.0.15"
    - "expo-build-properties ~56.0.14"
    - "expo-constants (transitive but pinned)"
    - "eas-cli ^19.0.8 (devDep)"
  patterns:
    - "Expo SDK 56 + EXPO_PUBLIC_* env → app.config.ts extra → Constants.expoConfig.extra at runtime"
    - "forceStaticLinking: ['RNFBApp','RNFBAuth'] (mandatory RN 0.84+ Pitfall A)"
    - "Module-eval-time config validation with loud Error (Pitfall C)"
key-files:
  created:
    - app.config.ts
    - .env.example
    - .env (gitignored, not in commit)
    - GoogleService-Info.plist (STUB — see 01-02-STUBS.md)
    - google-services.json (STUB — see 01-02-STUBS.md)
    - .planning/phases/01-native-phone-auth-env-config/01-02-STUBS.md
    - tests/__mocks__/firebase-stub.js
  modified:
    - package.json
    - package-lock.json
    - .gitignore
    - src/lib/firebase.ts
    - jest.config.js
  deleted:
    - app.json
decisions:
  - "STUBBED run: GoogleService-Info.plist + google-services.json committed as placeholders with TODO REPLACE markers. User accepted that real on-device OTP will NOT work until those are replaced with Firebase Console downloads. See 01-02-STUBS.md."
  - "Bundle id + Android package locked to com.chitti.app (both platforms)."
  - "auth export TEMPORARILY retained in firebase.ts to keep AuthContext + LoginScreen compiling between Plan 02 and Plan 04. TEMP marker in source for grep-removal in 01-04."
  - "Firebase JS SDK ESM crashes Jest — added moduleNameMapper + tests/__mocks__/firebase-stub.js (Rule-3 deviation). Metro/EAS builds unaffected."
  - "Stubs committed (not gitignored) so the path references in app.config.ts resolve; follow-up plan should git-rm stubs, uncomment the .gitignore lines, and migrate to EAS file-secrets."
metrics:
  duration_seconds: 1800
  completed_date: "2026-05-24"
  tasks_completed: 3
  files_created: 7
  files_modified: 5
  files_deleted: 1
---

# Phase 01 Plan 02: Config + Deps Summary

> Env-driven Firebase config + native dep chain installed; runtime auth deliberately stubbed (user-acknowledged) pending Firebase Console iOS/Android app registration.

## ⚠️ STUBBED RUN — READ THIS FIRST

This plan was executed in **stubbed mode** at the user's explicit direction. The code-structure changes (deps, `app.config.ts`, env vars, `firebase.ts` rewrite, plugin registration) all landed. **Real on-device OTP authentication will NOT work** until the placeholder Firebase native config files are replaced.

See **`.planning/phases/01-native-phone-auth-env-config/01-02-STUBS.md`** for the exact replacement instructions. Three Firebase Console actions are owed:

1. Register iOS app with bundle `com.chitti.app` → download `GoogleService-Info.plist` → overwrite stub.
2. Register Android app with package `com.chitti.app` → download `google-services.json` → overwrite stub.
3. Ensure Phone sign-in method is **Enabled** in Firebase Console.

Plan 01-04 (auth swap) can compile against the new shape — but anyone running `eas build` afterward and expecting real OTP delivery will hit native-init failures.

## What Shipped

### Task 1 — Native dep chain (commit `3d525d3`)
- `@react-native-firebase/app@^24.0.0`, `@react-native-firebase/auth@^24.0.0`
- `expo-dev-client@~56.0.15`, `expo-build-properties@~56.0.14`
- `eas-cli@^19.0.8` (devDep)
- `libphonenumber-js` was already present from Plan 01-03; `firebase` JS SDK retained for Firestore.

### Task 2 — app.config.ts + env (commit `7f34a22`)
- Deleted `app.json`; created `app.config.ts` as the single Expo config source (Pitfall B avoided).
- Bundle id + Android package: `com.chitti.app`.
- Plugins: `expo-font`, `@react-native-firebase/app`, `@react-native-firebase/auth`, `expo-dev-client`, `expo-build-properties` with `ios.useFrameworks='static'` + `forceStaticLinking=['RNFBApp','RNFBAuth']` (Pitfall A).
- `extra.firebase` populated from six `EXPO_PUBLIC_FIREBASE_*` env vars at config-eval time.
- `.env` (gitignored, real chitti-app-edfb1 values) + `.env.example` (committed schema).
- `.gitignore`: added `.env` with `!.env.example` negation. Native config file ignores are commented-out for now (stubs are tracked).
- **STUB files committed:** `GoogleService-Info.plist`, `google-services.json` — see 01-02-STUBS.md.

### Task 3 — firebase.ts rewrite + DATA-04 GREEN (commit `6aa1827`)
- `src/lib/firebase.ts` reads from `Constants.expoConfig.extra.firebase`; throws `Error("Firebase config missing …")` when `apiKey` / `projectId` / `appId` are absent (Pitfall C — loud, named, at module-eval time).
- Hardcoded `AIzaSy…` API key literal removed from `src/`. (Same key still lives in gitignored `.env` and inside the STUB `GoogleService-Info.plist` / `google-services.json` — and acknowledged as already-public on GitHub per STATE.md.)
- `auth` export retained TEMPORARILY behind a `TEMP: removed in Plan 01-03` marker comment so AuthContext + LoginScreen keep compiling until Plan 01-04 swaps to `@react-native-firebase/auth`. The TEMP marker is intentionally grep-findable.
- Installed `expo-constants` (was transitive; now direct).
- Added `tests/__mocks__/firebase-stub.js` + `jest.config.js` `moduleNameMapper` (Rule-3 deviation, see below).
- `tests/firebase-config.test.ts` now PASSES (DATA-04 unit-test gate GREEN).

## Verification

| Check | Result |
|---|---|
| `npx expo config --type public` parses | ✅ — `extra.firebase.projectId === 'chitti-app-edfb1'` |
| RNFirebase plugins registered in app.config.ts | ✅ — `@react-native-firebase/app`, `@react-native-firebase/auth` |
| `forceStaticLinking: ['RNFBApp','RNFBAuth']` present | ✅ |
| `app.json` deleted | ✅ (Pitfall B) |
| `grep -c "AIzaSyAoi" src/lib/firebase.ts` returns 0 | ✅ |
| `grep -c "Constants.expoConfig" src/lib/firebase.ts` ≥ 1 | ✅ (3) |
| `grep -c "Firebase config missing" src/lib/firebase.ts` ≥ 1 | ✅ (1) |
| `tests/firebase-config.test.ts` GREEN | ✅ |
| Full jest suite | 23 / 24 GREEN (1 RED = `tests/auth-context.test.ts`, a Plan 01-04 RED scaffold — expected) |
| `npx tsc --noEmit` (src/ only) | ✅ — zero errors in `src/` |
| `.env` properly gitignored | ✅ (`git check-ignore .env` confirms) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Firebase JS SDK ESM crashes Jest under jest-expo**
- **Found during:** Task 3 verification (`tests/firebase-config.test.ts`).
- **Issue:** `firebase/app` (and transitively `@firebase/util`) ship `dist/esm/*.esm.js` files with raw `export` syntax. babel-preset-expo via `jest-expo` doesn't reliably transpile every nested `@firebase/*` package — Node crashes with "Unexpected token 'export'" before `readConfig()` can even run. The existing `transformIgnorePatterns` (set up in Plan 01-01) was correct in intent but the deep require chain still hits an untransformed ESM file.
- **Fix:** Added `tests/__mocks__/firebase-stub.js` exporting no-op shims for `initializeApp`, `getApps`, `getAuth`, `getFirestore`. Added `moduleNameMapper` in `jest.config.js` mapping `firebase/app`, `firebase/auth`, `firebase/firestore` to the stub. The DATA-04 test doesn't actually exercise SDK behavior — `readConfig()` throws first — so stubbing the SDK is correct: it preserves the test's intent while sidestepping the ESM-transform issue. Metro/EAS builds are unaffected (only the Jest environment maps to the stub).
- **Files modified:** `jest.config.js`, `tests/__mocks__/firebase-stub.js` (created).
- **Commit:** `6aa1827`.

**2. [Rule 3 — Blocking] `app.json` was modified by `npx expo install`**
- **Found during:** Task 2 (when running `git rm app.json`).
- **Issue:** `expo install @react-native-firebase/...` auto-injected the new plugins into the existing `app.json`. The plan called for porting fields then deleting `app.json` — but the file was now modified and `git rm` refused without `-f`.
- **Fix:** Used `git rm -f app.json` since the canonical config now lives in the newly-authored `app.config.ts` (Pitfall B mandates a single source).
- **Files modified:** `app.json` (deleted).
- **Commit:** `7f34a22`.

### Plan Scope Reduction (User-Acknowledged)

**3. [Directive — Stubbed run] Native Firebase config files committed as TODO-marked stubs**
- **Reason:** User chose option "Skip 02 for now — attempt 04 with stub native files" when prompted with realistic alternatives. The user explicitly acknowledged that "real OTP won't work" with this approach.
- **What this means:** `GoogleService-Info.plist` and `google-services.json` exist at repo root with real public values (API key, sender ID, project ID, storage bucket, bundle/package = `com.chitti.app`) AND with `TODO-REPLACE-*` literals for the app-specific fields that only exist after iOS/Android app registration in Firebase Console (`GOOGLE_APP_ID`, `CLIENT_ID`, `REVERSED_CLIENT_ID`, `mobilesdk_app_id`).
- **Plan-as-written said:** Files come from Firebase Console + are gitignored.
- **What we did:** Stubs committed (so `app.config.ts` path references resolve) with loud markers in both human-readable comment form and as literal string values. `.gitignore` has commented-out lines for both files ready to be uncommented in the follow-up plan.
- **Replacement plan:** See `01-02-STUBS.md` — three Firebase Console actions + a follow-up plan to git-rm the stubs, uncomment `.gitignore`, and migrate to EAS file-secrets.
- **Commits:** `7f34a22` (stub files committed).

## Deferred Issues (out of scope; logged for verifier)

- **TypeScript errors in `tests/*.ts` files** (`Cannot find name 'expect' / 'it'`). Pre-existing — caused by `tsconfig.json` extending `expo/tsconfig.base.json` which has no explicit `include`, so test files end up in the program but `@types/jest` isn't in `compilerOptions.types`. This existed before plan 01-02. `src/` itself has zero tsc errors. Should be cleaned up in a future test-infra hardening pass (Plan 01-01 follow-up).
- **`npm run lint` fails with "No files matching the pattern 'src'"** on Windows / bash combo. Pre-existing CLI / glob issue — running `npx eslint src/lib/firebase.ts` directly succeeds, so the rule wiring is fine. Likely needs `eslint "src/**/*.{ts,tsx,js,jsx}"` quoting in the npm script. Out of scope: this script was set in Plan 01-01.
- **`tests/auth-context.test.ts` 1-of-2 assertions RED.** This was an intentional RED scaffold from Plan 01-01 gating Plan 01-04. Before Task 1 it RED'd because `@react-native-firebase/auth` wasn't installed; now it RED's at `require('../src/lib/AuthContext')` because the AuthContext still imports the JS-SDK auth path through firebase.ts (which now correctly errors when `extra.firebase` is empty under the test's empty-extra mock). Plan 01-04 will fix this by swapping AuthContext to RNFirebase.

## Known Stubs

| Stub | File | Marker | Replacement Path |
|---|---|---|---|
| iOS Firebase native config | `GoogleService-Info.plist` | `TODO-REPLACE-IOS-APP-ID`, `TODO-REPLACE-IOS-CLIENT-ID`, `TODO-REPLACE-IOS-REVERSED-CLIENT-ID` + top-of-file XML comment | Register iOS app in Firebase Console + download real file |
| Android Firebase native config | `google-services.json` | `TODOREPLACEANDROIDAPPID` in `mobilesdk_app_id` + `_TODO_REPLACE_BEFORE_DEVICE_TESTING` sentinel field | Register Android app in Firebase Console + download real file |

Neither stub will prevent compilation of Plan 01-04's auth swap. Both WILL prevent successful EAS-built dev-client native init. The user has acknowledged this trade-off.

## Pointer to Future Work

- **API key rotation** (STATE.md "Pending Todos"): the `AIzaSyAoi…` API key is now in `.env` + stubs but is already public on GitHub from earlier commits. Rotate in Phase 6 (STORE-04) when provisioning a clean production Firebase project.
- **Stub → EAS-secret migration**: once real `GoogleService-Info.plist` + `google-services.json` are downloaded, a follow-up plan should `git rm` the stubs, uncomment the two `.gitignore` lines, and add both as EAS file-secrets named `GOOGLE_SERVICES_JSON` + `GOOGLE_SERVICE_INFO_PLIST` (already wired into `app.config.ts` via `process.env.*` fallback).

## Self-Check: PASSED

Verified all created files exist:

- ✅ FOUND: `app.config.ts`
- ✅ FOUND: `.env.example`
- ✅ FOUND: `.env` (untracked, gitignored — confirmed via `git check-ignore`)
- ✅ FOUND: `GoogleService-Info.plist`
- ✅ FOUND: `google-services.json`
- ✅ FOUND: `.planning/phases/01-native-phone-auth-env-config/01-02-STUBS.md`
- ✅ FOUND: `tests/__mocks__/firebase-stub.js`
- ✅ NOT FOUND (correct — deleted): `app.json`

Verified all commits exist:
- ✅ FOUND: `3d525d3` (Task 1 — deps install)
- ✅ FOUND: `7f34a22` (Task 2 — app.config.ts + env + stubs)
- ✅ FOUND: `6aa1827` (Task 3 — firebase.ts rewrite + DATA-04 GREEN)
