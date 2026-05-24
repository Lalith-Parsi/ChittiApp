---
phase: 01-native-phone-auth-env-config
plan: 04-native-auth-swap-and-eas
subsystem: auth
tags: [auth, rnfirebase, eas, login, native, wave-3]
dependency_graph:
  requires:
    - "01-02 (RNFirebase deps + app.config.ts + env-driven firebase.ts)"
    - "01-03 (src/utils/phone.ts toE164)"
  provides:
    - "eas.json (development/preview/production build profiles)"
    - "AuthContext on @react-native-firebase/auth; auth().onAuthStateChanged + auth().signOut()"
    - "LoginScreen using auth().signInWithPhoneNumber(e164) + confirmation.confirm(code)"
    - "mapPhoneAuthError(e) helper for RNFirebase error codes"
    - "Voice-OTP fallback wired ('Call me instead' → forceResend=true)"
    - "src/lib/firebase.ts owns only Firestore JS-SDK init; no auth export"
  affects:
    - "src/screens/HomeScreen.tsx (signOut path swapped to RNFirebase — Rule-3)"
    - "src/screens/AddMemberScreen.tsx (auth.currentUser → auth().currentUser — Rule-3)"
tech-stack:
  added: []
  patterns:
    - "Native phone auth: auth().signInWithPhoneNumber(e164) returns FirebaseAuthTypes.ConfirmationResult"
    - "Native session persistence via iOS Keychain / Android SharedPreferences (automatic on RNFirebase — no getReactNativePersistence wiring)"
    - "Error-code → user-string mapping in LoginScreen mapPhoneAuthError"
    - "Voice-OTP fallback via auth().signInWithPhoneNumber(e164, true /*forceResend*/) — Firebase auto-escalates to voice on second attempt for the same number"
key-files:
  created:
    - eas.json
    - .planning/phases/01-native-phone-auth-env-config/01-04-native-auth-swap-and-eas-SUMMARY.md
  modified:
    - src/lib/AuthContext.tsx
    - src/lib/firebase.ts
    - src/screens/LoginScreen.tsx
    - src/storage/index.ts
    - src/screens/HomeScreen.tsx
    - src/screens/AddMemberScreen.tsx
decisions:
  - "Voice-OTP fallback uses auth().signInWithPhoneNumber(e164, forceResend=true). Rationale: keeps the API surface identical to the SMS path so the existing ConfirmationResult state machine works unchanged. Firebase's native escalation policy auto-falls back to voice when a second OTP request comes in for the same number, so we don't need a separate verifyPhoneNumber + ApplicationVerifier flow."
  - "src/lib/firebase.ts now only handles Firestore JS-SDK init. Auth lives exclusively on '@react-native-firebase/auth'. Future Phase-2 work can decide whether to migrate Firestore to '@react-native-firebase/firestore' too; for now the mixed-SDK setup is officially supported by Firebase."
  - "Three out-of-scope files (HomeScreen, AddMemberScreen) also imported the now-removed JS-SDK `auth` from '../lib/firebase'. Applied Rule-3 (blocking-issue auto-fix) to swap them to the RNFirebase default import — without this the build would not compile."
metrics:
  duration_minutes: ~10
  completed: 2026-05-24
  tasks_completed: 3
  files_touched: 6
---

# Phase 1 Plan 04: Native Auth Swap + EAS Config — Summary

Swap LoginScreen + AuthContext + storage off the Firebase JS-SDK's web-only `RecaptchaVerifier` chain onto `@react-native-firebase/auth`; add `eas.json` with three build profiles. Closes AUTH-03 and AUTH-04 in code (physical-device verification remains owed to Plan 05).

## What landed

### 1. `eas.json` — three build profiles

| Profile | Distribution | Type | Notes |
|---|---|---|---|
| `development` | internal | dev-client APK / non-simulator iOS | `developmentClient: true`; env passthrough for all EXPO_PUBLIC_FIREBASE_* + GOOGLE_SERVICES_JSON / GOOGLE_SERVICE_INFO_PLIST |
| `preview` | internal | release APK / non-simulator iOS | same env block; release build |
| `production` | (store) | Android `app-bundle` | `autoIncrement: true`; submit.ios fields TBD (Phase 6 owns store credentials) |

`cli.version` constrained to `>= 19.0.0` per RESEARCH.md §2. Node pin set to 20.18.0 across all profiles. iOS resourceClass `m-medium`, Android `medium`.

### 2. AuthContext + storage swap (Task 2 commit)

Import diff:

| Before | After |
|---|---|
| `import { onAuthStateChanged, signOut, User } from 'firebase/auth'` | `import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth'` |
| `import { auth } from './firebase'` | _(removed — `auth()` is a singleton accessor)_ |
| `onAuthStateChanged(auth, u => ...)` | `auth().onAuthStateChanged(u => ...)` |
| `signOut(auth)` | `auth().signOut()` |
| `User` (from firebase/auth) | `type User = FirebaseAuthTypes.User` |

`__demoMode`, `DEMO_USER`, `enterDemoMode`, `leaveDemoMode`, `AppUser` shape (`{ uid, phoneNumber, isDemo }`) are byte-identical to before.

`src/storage/index.ts`: same import swap (`auth` from RNFirebase); `auth.currentUser` → `auth().currentUser`.

### 3. LoginScreen rewrite (Task 3 commit)

`RecaptchaVerifier` (class import), `signInWithPhoneNumber` (function import), `ConfirmationResult` (type import) from `firebase/auth` → all gone. Now: `import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth'` + `import { toE164 } from '../utils/phone'`. `ConfirmationResult` is locally aliased to `FirebaseAuthTypes.ConfirmationResult`.

`sendOTP` now:
```ts
const e164 = toE164(phoneDisplay, 'IN');           // canonical writer (Pitfall 6)
if (!e164) { setError("That number doesn't look right."); return; }
const result: ConfirmationResult = await auth().signInWithPhoneNumber(e164);
setConfirmation(result); setStep('otp'); setSecondsLeft(42);
```
catch arm now routes through `mapPhoneAuthError(e)` (RESEARCH.md §9) — maps `auth/invalid-phone-number`, `auth/too-many-requests`, `auth/quota-exceeded`, `auth/invalid-verification-code`, `auth/code-expired`, `auth/session-expired`, `auth/network-request-failed`, `auth/missing-phone-number` to short user-facing strings.

`verifyOTP` body unchanged in shape — still `await confirmation.confirm(code)` — but error arm now uses `mapPhoneAuthError`.

**Removed lines (Pitfall closures):**
- The `` `+91${digits}` `` template literal (Pitfall 6 ESLint violation **cleared** on LoginScreen).
- `(window as any).recaptchaVerifier` write (Pitfall 7).
- `new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' })` (Pitfall 7).
- The `<View nativeID="recaptcha-container" />` JSX leaf (Pitfall 7).

**Voice-OTP fallback** — the "Call me instead" button is now wired to a new `requestVoiceOTP` handler that re-issues `auth().signInWithPhoneNumber(e164, true /*forceResend*/)`. Firebase's built-in escalation policy auto-falls back from SMS to voice on a second request for the same number, so we don't need a separate `verifyPhoneNumber` / `PhoneAuthProvider` flow. The UI flow is identical from the user's perspective — they tap the link, get a fresh confirmation (now via call), and enter the 6-digit code as before. Pitfall 8 mitigated.

### 4. `src/lib/firebase.ts` — TEMP auth export removed

The Plan 02 TEMP export (`export const auth = getAuth(app)`) is gone, along with the `firebase/auth` `getAuth` import. The file's responsibility is now only Firestore JS-SDK init. Top-comment updated to reflect the auth split.

## Verification

| Gate | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit --types jest` | exit 0 |
| Tests | `npm test` | 4 suites / **24 tests pass** (auth-context.test.ts GREEN, was RED) |
| Lint (modified files) | `npx eslint src/screens/LoginScreen.tsx src/lib/AuthContext.tsx src/storage/index.ts src/screens/HomeScreen.tsx src/screens/AddMemberScreen.tsx src/lib/firebase.ts --max-warnings=0` | exit 0 |
| eas.json schema | node profile-presence check | OK (development/preview/production all present; developmentClient=true; production.android.buildType=app-bundle) |
| LoginScreen invariants | grep for `RecaptchaVerifier` / `recaptcha-container` / `+91` concat / `+91${` | none found |
| `firebase.ts` | grep for `export const auth` / `getAuth` | none found; `db` still exported |

## Test pass-count delta

| Test file | Before | After |
|---|---|---|
| tests/auth-context.test.ts | **RED** (mock target unresolved — RNFirebase not yet imported by AuthContext) | **GREEN** (AuthProvider/useAuth resolve; mocked auth().signOut() emits null user) |
| tests/firebase-config.test.ts | GREEN | GREEN |
| tests/phone.test.ts | GREEN | GREEN |
| tests/money.test.ts | GREEN | GREEN |

Total: **24 / 24 GREEN** (was 23 / 24 with auth-context RED).

## Deviations from Plan

### Rule 3 — Auto-fixed Blocking Issues

**1. [Rule 3 - Blocker] HomeScreen and AddMemberScreen still imported `auth` from `../lib/firebase`**
- **Found during:** Task 3 (after `firebase.ts` TEMP export was removed, `npx tsc` reported `TS2614: Module '"../lib/firebase"' has no exported member 'auth'` in two files outside the plan's nominal scope).
- **Fix:** swapped both files to `import auth from '@react-native-firebase/auth'`; replaced `auth.currentUser?.uid` → `auth().currentUser?.uid` (AddMemberScreen) and `signOut(auth)` → `auth().signOut()` (HomeScreen, plus dropping the `firebase/auth` `signOut` named import).
- **Files modified:** `src/screens/HomeScreen.tsx`, `src/screens/AddMemberScreen.tsx`
- **Commit:** included in the Task-3 commit (`feat(01-04): rewrite LoginScreen + remove TEMP auth export from firebase.ts`)
- **Why this was forced:** the plan asked for the TEMP auth export removal; that immediately breaks any other caller still on the JS-SDK shape. Two callers existed. Without the fix `tsc` failed, blocking the plan's `npx tsc --noEmit` verification gate.

No other deviations. No Rule-4 (architectural) decisions were needed.

## Runtime gotcha — native files are still stubbed

Per `01-02-STUBS.md`, `GoogleService-Info.plist` and `google-services.json` at the repo root contain TODO-marker placeholders, not real Firebase Console downloads. **The code structure landed by this plan is correct, but the EAS iOS/Android dev-client builds will fail at native compile** until those stubs are replaced with real configs registered against bundle `com.chitti.app` (Plan 05 owns the Firebase Console registration + EAS file-type-secret migration). The auth swap itself does not depend on the native files at JS-compile time — `npm test` and `tsc` pass cleanly today. Plan 05 is where the swap gets exercised on real hardware.

## Requirements posture

| Req | Status after this plan |
|---|---|
| AUTH-01 (iOS OTP on device) | Code ready; **physical-device verification owed to Plan 05** |
| AUTH-02 (Android OTP on device) | Code ready; **physical-device verification owed to Plan 05** |
| AUTH-03 (session persists cold start) | **Code complete** — RNFirebase auto-persists via iOS Keychain / Android SharedPreferences; no app code needed. Hardware verification still owed (Plan 05). |
| AUTH-04 (sign-out returns to OTP) | **Code complete** — `auth().signOut()` is the sole sign-out path (HomeScreen → leaveDemoMode → also signs out real Firebase user; demo path unchanged). Unit-mocked sign-out emits null user via `onAuthStateChanged` (tests/auth-context.test.ts GREEN). Hardware verification still owed (Plan 05). |

## Self-Check: PASSED

- eas.json exists at repo root ✓
- All 6 modified source files lint and compile cleanly ✓
- `tests/firebase-config.test.ts` and `tests/auth-context.test.ts` both PASS ✓
- Commits: `2c62589`, `7f94aea`, `e6348c1` ✓
