# Plan 01-02 — Stub Native Config Files

**Created:** 2026-05-24
**Reason:** User chose "Skip 02 for now — attempt 04 with stub native files" — Plan 01-02 lands the **code-structure** changes (`app.config.ts`, env vars, RNFirebase plugin, `firebase.ts` rewrite, deps) so that Plan 01-04's auth swap can compile against the new shape. **Real on-device OTP authentication will NOT work** until the stubs below are replaced.

## Stubbed Files (committed to git this plan)

| File | Location | What's a stub | How to replace |
|---|---|---|---|
| `GoogleService-Info.plist` | repo root | `GOOGLE_APP_ID`, `CLIENT_ID`, `REVERSED_CLIENT_ID` are `TODO-REPLACE-*` literals. The rest (API key, sender ID, project ID, bundle, storage bucket) are real and match the dev project. | Firebase Console → `chitti-app-edfb1` → ⚙ → **Your apps** → register an iOS app with bundle id `com.chitti.app` → **Download GoogleService-Info.plist** → drop at repo root, overwriting the stub. |
| `google-services.json` | repo root | `mobilesdk_app_id` ends in `TODOREPLACEANDROIDAPPID`; `_TODO_REPLACE_BEFORE_DEVICE_TESTING` field at top. The rest (project number, project id, storage bucket, API key, package name) are real. | Firebase Console → `chitti-app-edfb1` → ⚙ → **Your apps** → register an Android app with package `com.chitti.app` → **Download google-services.json** → drop at repo root, overwriting the stub. |

## Why these are committed (not gitignored) right now

The original plan said gitignore both files and supply via EAS secrets. We deferred that to a later plan because:

1. We need *something* at the path `app.config.ts` references (`./GoogleService-Info.plist`, `./google-services.json`) so `npx expo config` and `npx expo prebuild` don't fail with missing-file errors.
2. The stubs make it obvious in `git diff` to the reviewer that the file is a placeholder (loud TODO markers, sentinel literal strings).
3. Once the real files are downloaded, a follow-up plan should:
   - `git rm` both committed stubs.
   - Uncomment the two lines at the bottom of `.gitignore` (currently `# google-services.json` and `# GoogleService-Info.plist`).
   - Add both as **EAS file-type secrets** (`GOOGLE_SERVICES_JSON`, `GOOGLE_SERVICE_INFO_PLIST`) so EAS Build can fetch them at build time.

## What Will Break Right Now (acknowledged, NOT fixed by this plan)

- `auth().signInWithPhoneNumber()` from `@react-native-firebase/auth` will fail at native init on iOS with "Could not find a valid GoogleService-Info.plist in your project" (or similar) because `GOOGLE_APP_ID` is a stub. Android will fail equivalently from the stub `mobilesdk_app_id`.
- `npx expo prebuild` may succeed (the files exist and parse), but the resulting native projects will not boot a working Firebase SDK.
- **What still works:** `npx expo config --type public` (config evaluation), TypeScript compilation, the Jest unit suite, and the structural shape that Plan 01-04 (auth swap) needs to compile against.

## Replacement Instruction Count

**3 separate Firebase Console actions** before real-device testing can begin:

1. Register iOS app with bundle `com.chitti.app` → download `GoogleService-Info.plist`.
2. Register Android app with package `com.chitti.app` → download `google-services.json`.
3. Ensure **Phone** sign-in method is enabled at Firebase Console → Authentication → Sign-in method → Phone.

Plus the follow-up gitignore + EAS-secret migration described above.

## Reference

- Plan: `.planning/phases/01-native-phone-auth-env-config/01-02-config-and-deps-PLAN.md`
- Research: `.planning/phases/01-native-phone-auth-env-config/01-RESEARCH.md` §"Runtime State Inventory" and §"Pattern 1"
- Bundle/package lock: `com.chitti.app` on both platforms (set in `app.config.ts`).
