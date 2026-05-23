# Phase 1: Native Phone Auth & Env Config — Research

**Researched:** 2026-05-23
**Domain:** Native phone OTP auth on Expo SDK 56 + EAS Build; env-driven Firebase config; phone normalization + money primitive
**Confidence:** HIGH on dep versions (npm-verified), config plugin shape (official docs), DLT landscape (multiple India SMS providers + TRAI guides). MEDIUM on India SMS deliverability rates with Firebase default (empirical, no first-party number). MEDIUM on EAS free-tier build times for a project this size (no first-party build yet).

## Summary

The Phase 1 work is well-scoped and de-risked by the UI already being in place. The critical path is:

1. Add `@react-native-firebase/{app,auth}` + `expo-dev-client` + `expo-build-properties` + `libphonenumber-js`, wire the config plugin in `app.json` with `forceStaticLinking` (mandatory on RN 0.84+ / Expo SDK 54+).
2. Move Firebase config out of `src/lib/firebase.ts` into `app.config.ts` + `Constants.expoConfig.extra` — this MUST land **before** EAS builds, because EAS Build evaluates `app.config.ts` at build time to embed `extra` into the binary.
3. Add `src/utils/phone.ts` (libphonenumber-js `min` build) and `src/utils/money.ts` (branded-integer Paisa).
4. Rewrite `sendOTP()` / `verifyOTP()` in `LoginScreen.tsx` to use `auth().signInWithPhoneNumber()` from `@react-native-firebase/auth`. Drop the `recaptcha-container` View and the `(window as any).recaptchaVerifier` write.
5. Verify on physical iOS + Android with EAS-built dev-client binaries.

**DLT decision:** **Option (a) — Firebase default is acceptable for v1.** Defer DLT-registered provider integration to v1.x. Rationale + revisit criteria below in §4.

**Primary recommendation:** Ship Phase 1 as scoped. Do not expand to include DLT-SMS provider integration — the cost (provider contract, Cloud Function, custom token flow, ₹5,900+ entity registration, template approval lead time) is disproportionate to a beta-stage app where Firebase's default route + voice-call fallback covers ~90%+ of users.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Native auth library:** `@react-native-firebase/auth` + `@react-native-firebase/app`. Use native `auth().signInWithPhoneNumber()` — no JS-SDK `RecaptchaVerifier`. Remove `recaptcha-container` View and `(window as any).recaptchaVerifier`. Keep existing UI components and state machine — only API calls change. Expo Go is **dropped**; EAS Build is the only runtime from here on.
- **EAS Build setup:** in this phase. Three profiles in `eas.json` — `development` (dev client, internal), `preview` (release, internal), `production` (store-ready). `expo-dev-client` added. EAS credentials wired for Google service account + Apple key. One successful build per profile is part of verification.
- **Verification:** physical iOS (iOS 17+, Indian Jio/Airtel SIM) AND physical Android (Pixel/Samsung, Android 13+, Indian SIM). Sign-in → land Home → force-quit → reopen still signed in → sign-out returns to phone-entry. **Both platforms required.** No simulator-only counts.
- **Paisa:** minimal helper in `src/utils/money.ts`. Branded integer (`number & { __brand: 'Paisa' }`), `paisa()`, `toRupees()`, `formatINR()`, `addPaisa()`, `subPaisa()`, `mulPaisa()`. **Do NOT migrate existing fields.** ADR-style header comment in file.
- **toE164:** `libphonenumber-js` (small `min` build). `src/utils/phone.ts` with `toE164(input, defaultCountry='IN')`, `isValidIndianMobile()`, `formatNational()`. Update `LoginScreen.tsx` + `AddMemberScreen.tsx`. ESLint rule forbidding `'+91' + ` concatenation.

### Claude's Discretion

- `eas.json` schema and concrete profile contents.
- `firebase.config.ts` / `app.config.ts` exact shape — standardize on `expo-constants` + `EXPO_PUBLIC_*` env names.
- Whether to commit a `.env.example` with placeholder keys.
- Auth-error logging strategy (silent + toast vs sentry-like).
- Whether sign-out clears demo data too.
- Exact toast copy on auth success/failure.

### Deferred Ideas (OUT OF SCOPE)

- Full Paisa migration of existing `ChittiGroup.amount` / `Cycle.winAmount` fields.
- Sentry / Crashlytics wiring (v1.x).
- Account-deletion endpoint (Phase 6 / STORE-04).
- Phone-number-change flow.
- OAuth (Google) fallback — explicitly removed in PROJECT.md.
- Native phone auth on web — web stays demo-mode + dev-only.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Sign in via OTP on physical iOS | §1 (RNFirebase iOS setup), §8 (verification matrix) |
| AUTH-02 | Sign in via OTP on physical Android | §1 (RNFirebase Android setup), §8 |
| AUTH-03 | Session persists across cold start | §7 (RNFirebase native keychain/SharedPreferences auto-persistence) |
| AUTH-04 | Sign out returns to OTP screen | §1 (`auth().signOut()` API), keeps existing `AuthContext` contract |
| DATA-04 | Firebase config via `app.config.ts` + `expo-constants` (no hardcoded keys) | §3 (env-driven config shape) |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| OTP send / verify | Native module (iOS/Android) | — | RNFirebase calls native Firebase SDK; bypasses reCAPTCHA on device |
| Session persistence | Native platform storage (iOS Keychain / Android SharedPreferences) | — | RNFirebase auto-persists at the native layer; no JS-side storage involved |
| Auth-state subscription | JS (`AuthContext`) | Native module bridge | `onAuthStateChanged` from `@react-native-firebase/auth` |
| Firebase config injection | Build-time (EAS) + JS runtime (`expo-constants`) | — | `app.config.ts` reads env at build/start; `Constants.expoConfig.extra` exposes at runtime |
| Phone normalization | JS utility (`src/utils/phone.ts`) | — | Pure function, lint-enforced single writer |
| Money primitives | JS utility (`src/utils/money.ts`) | — | Pure functions + TS branded type |
| Demo-mode short-circuit | JS (`AuthContext`) | — | Stays unchanged — demo bypasses RNFirebase entirely |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@react-native-firebase/app` | ^24.0.0 | Native Firebase SDK bootstrap | Only native path on Expo SDK 56; reads `google-services.json` / `GoogleService-Info.plist` at native init [VERIFIED: npm view] |
| `@react-native-firebase/auth` | ^24.0.0 | Native phone auth | Native module — no reCAPTCHA on device, auto-persistence via Keychain/SharedPrefs [VERIFIED: npm view] |
| `expo-dev-client` | ~56.0.15 | Dev client for native modules | Required since `@react-native-firebase/*` cannot run in Expo Go [VERIFIED: npm view] |
| `expo-build-properties` | ~1.0.x (latest Expo 56 compatible) | Configures `useFrameworks: "static"` + `forceStaticLinking` | **Mandatory** on RN 0.84+ / Expo SDK 54+ for RNFirebase iOS build [CITED: rnfirebase.io] |
| `libphonenumber-js` | ^1.13.3 | E.164 parsing | De-facto JS phone library; small `min` build is RN-friendly [VERIFIED: npm view] |
| `eas-cli` | ^19.0.8 (devDep or global) | EAS Build orchestration | Standard Expo build tool [VERIFIED: npm view] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@react-native-async-storage/async-storage` | ^3.1.0 (already installed) | — | NOT needed for RNFirebase auth (native persists). Keep dep — `ThemeContext` already uses it. |
| `firebase` ^12.13.0 (currently installed) | — | — | **Remove** after migration. Native RNFirebase replaces it for auth+firestore use cases in Phase 1. (Note: Phase 2 may keep `firebase` only if Firestore stays on JS SDK; revisit then.) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@react-native-firebase/auth` native | Firebase JS SDK + `signInWithCustomToken` + Cloud Function + Twilio/MSG91 | LOCKED OUT by CONTEXT.md. (Would be the path if user reversed the native decision.) |
| `libphonenumber-js` `min` | `libphonenumber-js` `max` / `mobile` | `min` is ~110 KB; `mobile` is `min` + mobile-only metadata; `max` is full ~530 KB. `min` suffices for India E.164 + validation per Pitfall 6. |

**Installation:**
```bash
npx expo install @react-native-firebase/app @react-native-firebase/auth
npx expo install expo-dev-client expo-build-properties
npm install libphonenumber-js
npm install -g eas-cli   # or use npx eas-cli
```

**Version verification (2026-05-23):**
- `@react-native-firebase/app@24.0.0` and `@react-native-firebase/auth@24.0.0` — `npm view` confirms.
- `expo-dev-client@56.0.15` — `npm view` confirms.
- `libphonenumber-js@1.13.3` — `npm view` confirms.
- `eas-cli@19.0.8` — `npm view` confirms.

## Architecture Patterns

### System Architecture (after Phase 1 lands)

```
LoginScreen.tsx
   │  sendOTP(): toE164(input) → auth().signInWithPhoneNumber(e164)
   │  verifyOTP(code): confirmation.confirm(code)
   ▼
@react-native-firebase/auth  ─────────► native iOS / Android Firebase SDK
   │                                          │
   │  onAuthStateChanged                      ▼
   ▼                                    Apple SMS / Google SMS
AuthContext.tsx                         ▼
   │  setFirebaseUser(u)                User's device receives OTP
   ▼
AppNavigator (auth-gated)

Firebase config (build-time):
   app.config.ts ──► process.env.EXPO_PUBLIC_FIREBASE_*  ──►  extra.firebase
                                                                │
                                                                ▼
   src/lib/firebase.ts (legacy) reads Constants.expoConfig.extra.firebase
   (Phase 1 keeps firebase.ts for db = getFirestore; auth now from RNFirebase)
```

### Recommended Project Structure (delta only)

```
src/
├── lib/
│   ├── firebase.ts       # REWRITE — reads from Constants.expoConfig.extra; keeps `db` export only
│   ├── AuthContext.tsx   # CHANGE — import auth from '@react-native-firebase/auth'
│   └── ...
├── screens/
│   └── LoginScreen.tsx   # CHANGE — swap RecaptchaVerifier + signInWithPhoneNumber for RNFirebase auth()
├── utils/
│   ├── phone.ts          # NEW — toE164, isValidIndianMobile, formatNational
│   └── money.ts          # NEW — Paisa branded type + helpers
app.config.ts             # NEW — replaces app.json (or sits alongside); reads env
eas.json                  # NEW — three profiles
.env.example              # NEW — committed placeholder
.env                      # NEW — gitignored
GoogleService-Info.plist  # NEW (gitignored — supply via EAS secret)
google-services.json      # NEW (gitignored — supply via EAS secret)
.eslintrc.js              # NEW — rule forbidding '+91' concatenation
```

### Pattern 1: RNFirebase config plugin in `app.config.ts`

```ts
// app.config.ts
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'ChittiApp',
  slug: 'ChittiApp',
  scheme: 'chitti',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.chittiapp.chitti',
    googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST ?? './GoogleService-Info.plist',
  },
  android: {
    package: 'com.chittiapp.chitti',
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: { favicon: './assets/favicon.png' },
  plugins: [
    'expo-font',
    '@react-native-firebase/app',
    '@react-native-firebase/auth',
    'expo-dev-client',
    [
      'expo-build-properties',
      {
        ios: {
          useFrameworks: 'static',
          forceStaticLinking: ['RNFBApp', 'RNFBAuth'],
        },
      },
    ],
  ],
  extra: {
    firebase: {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    },
  },
});
```

**Important:** Delete `app.json` (or strip its `expo` block — `app.config.ts` takes precedence and merging both is a footgun). `forceStaticLinking` is mandatory on RN 0.84+ / Expo SDK 54+ for RNFirebase iOS — without it iOS build fails with "non-modular header inside framework module RNFBApp." [CITED: rnfirebase.io, github.com/invertase/react-native-firebase#8657]

### Pattern 2: Rewritten `src/lib/firebase.ts`

```ts
// src/lib/firebase.ts — Phase 1
import Constants from 'expo-constants';
import { initializeApp, getApps, FirebaseOptions } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Native auth: import from '@react-native-firebase/auth' at call sites; not exported here.

interface ExpoFirebaseExtra { firebase: FirebaseOptions }

function readConfig(): FirebaseOptions {
  const extra = (Constants.expoConfig?.extra ?? {}) as Partial<ExpoFirebaseExtra>;
  const cfg = extra.firebase;
  if (!cfg?.apiKey || !cfg?.projectId || !cfg?.appId) {
    throw new Error('Firebase config missing from Constants.expoConfig.extra.firebase — check .env / EAS secrets');
  }
  return cfg;
}

const firebaseConfig = readConfig();
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export default app;
// NOTE: `auth` export removed. Use `import auth from '@react-native-firebase/auth'` and call `auth()`.
```

### Pattern 3: Rewritten `sendOTP()` / `verifyOTP()` in `LoginScreen.tsx`

**Before** (current code, web-only):
```ts
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth } from '../lib/firebase';

const fullPhone = `+91${digits}`;
const w = window as unknown as { recaptchaVerifier?: RecaptchaVerifier };
if (!w.recaptchaVerifier) {
  w.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
}
const result = await signInWithPhoneNumber(auth, fullPhone, w.recaptchaVerifier);
setConfirmation(result);
```

**After:**
```ts
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { toE164 } from '../utils/phone';

const e164 = toE164(phoneDisplay, 'IN');
if (!e164) { setError('That number doesn’t look right.'); return; }

try {
  const confirmation: FirebaseAuthTypes.ConfirmationResult =
    await auth().signInWithPhoneNumber(e164);
  setConfirmation(confirmation);
  setStep('otp');
  setSecondsLeft(42);
} catch (e) {
  // see §9 for error-code mapping
  setError(mapPhoneAuthError(e));
}

// verify:
await confirmation.confirm(code);
// onAuthStateChanged in AuthContext will pick up the new user
```

**Remove:**
- `<View nativeID="recaptcha-container" />` at the bottom of the phone step (line 199).
- The `(window as any).recaptchaVerifier` write.
- The import of `RecaptchaVerifier` / `signInWithPhoneNumber` / `ConfirmationResult` from `firebase/auth`.

### Pattern 4: `src/utils/phone.ts`

```ts
// src/utils/phone.ts
import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js/min';

export function toE164(input: string, defaultCountry: CountryCode = 'IN'): string | null {
  if (!input) return null;
  const parsed = parsePhoneNumberFromString(input, defaultCountry);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number;  // E.164, e.g. "+919876543210"
}

export function isValidIndianMobile(input: string): boolean {
  const digits = input.replace(/\D/g, '');
  // Fast path for UI: 10 digits starting 6-9 (TRAI mobile range)
  if (digits.length === 10 && /^[6-9]/.test(digits)) return true;
  // Slow path: full E.164 parse for already-formatted entries
  const parsed = parsePhoneNumberFromString(input, 'IN');
  return !!parsed?.isValid() && parsed.country === 'IN';
}

export function formatNational(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164);
  return parsed ? parsed.formatInternational() : e164;  // "+91 98765 43210"
}
```

Use the `/min` sub-path import — gives ~110 KB metadata, sufficient for parse + validate + format. [CITED: catamphetamine/libphonenumber-js]

### Pattern 5: `src/utils/money.ts` (Paisa)

```ts
// src/utils/money.ts
//
// ADR: Paisa is the integer-paisa money primitive for ChittiApp.
// Rule: any new money field added from Phase 1 onward uses Paisa. Existing
//       fields (ChittiGroup.amount, Cycle.winAmount, etc.) stay as plain
//       integer-rupees `number` until a planned migration phase. Do NOT
//       refactor existing fields ad-hoc — the math is currently correct
//       and a partial migration would introduce drift mid-flight.
//
// See: .planning/research/PITFALLS.md Pitfall 1 (floating-point money drift).

import { fmtINR } from '../lib/theme';

export type Paisa = number & { readonly __brand: 'Paisa' };

const PAISA_PER_RUPEE = 100;

export function paisa(rupees: number): Paisa {
  return Math.round(rupees * PAISA_PER_RUPEE) as Paisa;
}
export function toRupees(p: Paisa): number {
  return p / PAISA_PER_RUPEE;
}
export function addPaisa(a: Paisa, b: Paisa): Paisa { return (a + b) as Paisa; }
export function subPaisa(a: Paisa, b: Paisa): Paisa { return (a - b) as Paisa; }
export function mulPaisa(a: Paisa, n: number): Paisa { return Math.round(a * n) as Paisa; }

export function formatINR(p: Paisa, opts?: { withSymbol?: boolean }): string {
  const r = toRupees(p);
  return opts?.withSymbol === false
    ? fmtINR(r).replace(/^₹\s?/, '')
    : fmtINR(r);
}
```

### Pattern 6: ESLint rule against `'+91' + ` concatenation

Add `.eslintrc.js` (none today — `STACK.md` confirms no ESLint config present):

```js
// .eslintrc.js
module.exports = {
  root: true,
  extends: ['@react-native', '@expo'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        // Block string concat with '+91'
        selector:
          "BinaryExpression[operator='+'] > Literal[value=/^\\+91/]",
        message:
          "Don't hand-concatenate '+91'. Use toE164(input, 'IN') from src/utils/phone.ts.",
      },
      {
        // Block template literals like `+91${digits}`
        selector:
          "TemplateLiteral > TemplateElement[value.raw=/^\\+91$/]",
        message:
          "Don't hand-build E.164. Use toE164(input, 'IN') from src/utils/phone.ts.",
      },
    ],
  },
};
```

Pair with `npx eslint src --max-warnings=0` in a `package.json` `lint` script. Add `eslint`, `@react-native/eslint-config`, `@expo/eslint-config` as devDeps.

### Anti-Patterns to Avoid

- **Keeping `app.json` alive alongside `app.config.ts`.** They merge in confusing ways; pick one. Use `app.config.ts` only.
- **Committing `google-services.json` / `GoogleService-Info.plist` to git.** Supply via EAS secrets (file-type) so dev/prod can swap; gitignore both.
- **`EXPO_PUBLIC_FIREBASE_API_KEY` as a "secret".** Firebase web API keys are NOT secrets — they identify a project, not authenticate. Bundling into JS is fine. Security is enforced by Firestore rules + App Check (Phase 2+). [CITED: Firebase docs]
- **Adding `getReactNativePersistence(AsyncStorage)` from the JS SDK.** Not needed and actively wrong — RNFirebase manages persistence natively. Adding it pulls in the JS SDK's `firebase/auth` which we're trying to leave behind for auth. [CITED: rnfirebase.io]
- **Leaving the `recaptcha-container` View "just in case for web."** Web is demo-mode only per PROJECT.md. Remove it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Phone E.164 parsing | Regex + `'+91' + d.slice(0,10)` | `libphonenumber-js/min` `parsePhoneNumberFromString` | NRI users (+44/+1), 10 vs 11 digits with/without leading 0, formatting edge cases. Pitfall 6. |
| Native phone auth flow | Custom Cloud Function + Twilio/MSG91 + signInWithCustomToken | `@react-native-firebase/auth` | LOCKED. Avoids paid SMS, custom-token verification, Cloud Function maintenance for v1. |
| Auth-state persistence on RN | Manual AsyncStorage of tokens | RNFirebase native persistence (auto) | Native module stores in Keychain (iOS) / SharedPreferences (Android) automatically. |
| Money arithmetic | Float-based rupee math + `toFixed(2)` | Paisa branded integer | Pitfall 1 — silent drift breaks money-conservation invariant in Phase 5. |
| iOS/Android build infra | xcodebuild / gradle on CI | EAS Build profiles | Expo manages signing, credentials, prebuild, native module linking. |
| `.env` loading at build time | `dotenv` import in app code | Expo's built-in `process.env.EXPO_PUBLIC_*` + `Constants.expoConfig.extra` | Expo SDK 56 loads `.env` automatically; EAS Build injects `eas secret` values. |

**Key insight:** Phase 1 is overwhelmingly "wire standard pieces correctly" — every domain has a well-trodden official path. The pitfall is reaching for hand-rolled solutions because the JS SDK pattern in the prototype made everything feel custom.

## Runtime State Inventory

Phase 1 is mostly greenfield (new files) plus one significant **migration**: hardcoded Firebase config → env-driven. Auth-side, no existing real users — only demo data.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **Firebase Auth users in `chitti-app-edfb1` project** — STATE.md notes the dev project key is public on GitHub. Existing test users (if any) remain in Firebase Auth, unaffected by SDK swap. | No data migration. Rotate API key after Phase 1 confirms env config works (STATE.md "Pending Todos"). |
| Stored data | `users/{uid}/groups/*` Firestore docs (single-user prototype data) | None this phase — Phase 2 territory. |
| Live service config | **Firebase project `chitti-app-edfb1`** — Phone Auth provider must be enabled in Firebase Console > Auth > Sign-in method. (Currently enabled for web; needs to stay enabled for native — same toggle.) | Verify Phone Auth provider is **Enabled** for both iOS and Android in Firebase Console. Add SHA-1 / SHA-256 fingerprints for Android (EAS will provide these after first build). Add APN auth key for iOS (Apple Developer key uploaded to Firebase). |
| Live service config | **Firebase test phone numbers** for App Review / dev | Add 2–3 test numbers (e.g., `+91 90000 00001` → OTP `123456`) in Firebase Console > Auth > Phone numbers for testing. Use for dev to avoid burning real SMS quota. |
| OS-registered state | None — no Windows Task Scheduler / launchd / systemd dependency. | None. |
| Secrets/env vars | **`src/lib/firebase.ts` literal** — apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId. All 6 fields move to env vars. | Code edit + new `.env` (gitignored) + EAS secrets for prod profile. |
| Secrets/env vars | **EAS account credentials** — Apple App Store Connect API key, Google Play service account JSON. | Created during EAS setup; stored in EAS dashboard, not in repo. |
| Secrets/env vars | **`google-services.json` / `GoogleService-Info.plist`** — Firebase native config files. | Download from Firebase Console; add as EAS file-type secrets named `GOOGLE_SERVICES_JSON` and `GOOGLE_SERVICE_INFO_PLIST`; reference from `app.config.ts`; gitignore both. |
| Build artifacts / installed packages | `node_modules/firebase` — JS SDK still imported by `firestore.ts`. | Phase 1: keep `firebase` dep (still used for Firestore). Phase 2 may re-evaluate whether to swap Firestore to `@react-native-firebase/firestore` too. **Do not remove `firebase` from package.json this phase.** |
| Build artifacts / installed packages | `/ios` and `/android` directories — gitignored per STACK.md ("Expo-managed workflow"). | None — EAS Build generates these at build time via prebuild. |

## Common Pitfalls

Cross-referenced with `.planning/research/PITFALLS.md`. Pitfalls 1, 6, 7, 8 are directly in-scope for this phase.

### Pitfall A: forceStaticLinking missing → iOS build fails on EAS

**What goes wrong:** EAS iOS build fails with `non-modular header inside framework module 'RNFBApp'` or similar. No clear error pointing at the config plugin.
**Why it happens:** RN 0.84+ uses the "prebuilt core" framework system. RNFirebase modules export non-modular headers that conflict unless explicitly told to link statically.
**How to avoid:** Include `expo-build-properties` with `ios.useFrameworks: "static"` AND `ios.forceStaticLinking: ['RNFBApp', 'RNFBAuth']`. Test by running `npx eas build --profile development --platform ios` early in the phase.
**Warning signs:** First EAS iOS build fails; Android works; non-modular header in log.

### Pitfall B: `app.config.ts` and `app.json` both present → silent config merge

**What goes wrong:** EAS uses `app.json` fields, `app.config.ts` extras don't apply, runtime can't find Firebase config.
**How to avoid:** Delete `app.json` when adding `app.config.ts`. Keep all config in TS.

### Pitfall C: Firebase config not loaded on dev-client startup → AuthContext throws on launch (Pitfall 7 variant)

**What goes wrong:** `Constants.expoConfig.extra.firebase` is undefined because `.env` not loaded by `expo start`.
**Why it happens:** `EXPO_PUBLIC_*` vars are only read at `expo start` / build time, not at runtime from `.env` files. If you forget to put them in `.env` (or run from a different shell), the build embeds nothing.
**How to avoid:** Throw a loud error in `firebase.ts` if config keys are missing (Pattern 2 above). Document `.env.example`. EAS Build profiles use `eas secret` for production.
**Warning signs:** White screen on launch; error "Firebase config missing"; works in one dev's shell but not another's.

### Pitfall D: Phone normalization not applied on read (Pitfall 6)

**What goes wrong:** Old `Member.phone` values stored as `+91 98765 43210` (with spaces) don't match new E.164 writes (`+919876543210`). Phase 2 lookups by phone fail silently.
**How to avoid:** Phase 1 only writes E.164 going forward. Add a back-compat normalization on reads via `toE164(member.phone, 'IN')` in any future lookup. Add a comment in `Member` type that pre-Phase-1 values may be space-formatted.
**Warning signs:** Two phone formats coexist in Firestore (visible in console).

### Pitfall E: India SMS deliverability (Pitfall 8) — not addressed in Phase 1 by design

**What goes wrong:** ~5–15% of users (mostly Jio / BSNL) don't receive Firebase OTP because Firebase isn't DLT-registered with Indian carriers.
**Phase 1 mitigation:** "Call me instead" voice-OTP fallback button (UI already in `LoginScreen.tsx` line 287). Wire to `auth().verifyPhoneNumber(e164, { forceResendingToken })` or set `auth().settings.appVerificationDisabledForTesting = false` and rely on Firebase's automatic voice fallback. Document in support FAQ.
**Phase 1 instrumentation:** Add console logs (NOT a metrics service yet — Sentry is deferred per CONTEXT.md) for `phoneAuth.attempted`, `phoneAuth.success`. Manual monitoring during beta.
**Revisit trigger:** §4 below.

### Pitfall F: Recaptcha fallback on iOS for Firebase Phone Auth in Simulator

**What goes wrong:** Even with native RNFirebase, iOS Simulator falls back to reCAPTCHA (no real SMS delivery possible from simulator).
**How to avoid:** Verification matrix (§8) is explicit — physical device only. Document in PLAN that simulator can be used for UI work but auth verification must be on hardware.

## Code Examples

### Cold-start auth check (no code change needed in AuthContext)

`AuthContext.tsx` already uses `onAuthStateChanged(auth, ...)`. After Phase 1, swap the import:

```ts
// Before
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from './firebase';
// ...
const unsub = onAuthStateChanged(auth, u => { ... });

// After
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
// type alias to keep User shape
type User = FirebaseAuthTypes.User;
// ...
const unsub = auth().onAuthStateChanged(u => { ... });
// signOut becomes:
await auth().signOut();
```

The rest of the `AuthContext` (demo mode, `AppUser` shape, etc.) is unchanged.

### Error mapping for `LoginScreen`

```ts
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

function mapPhoneAuthError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-phone-number':       return 'That number doesn’t look right.';
    case 'auth/too-many-requests':          return 'Too many tries. Wait a bit and try again.';
    case 'auth/quota-exceeded':             return 'Too many tries today. Try tomorrow.';
    case 'auth/invalid-verification-code':  return 'That code didn’t match. Try again or resend.';
    case 'auth/code-expired':               return 'Code expired. Tap Resend.';
    case 'auth/network-request-failed':     return 'No network. Check your connection.';
    default:                                return 'Couldn’t verify. Try again.';
  }
}
```

This feeds the existing UI states (`'invalid'` / `'ratelimited'` / `'expired'` / `'wrong'`) via the existing `error` state and toast system. [CITED: firebase.google.com/docs/auth — error codes]

### Minimal `eas.json`

```json
{
  "cli": { "version": ">= 19.0.0", "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "env": {
        "EXPO_PUBLIC_FIREBASE_API_KEY": "$EXPO_PUBLIC_FIREBASE_API_KEY_DEV",
        "EXPO_PUBLIC_FIREBASE_PROJECT_ID": "chitti-app-edfb1"
      },
      "ios": { "simulator": false },
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "ios": { "simulator": false },
      "android": { "buildType": "apk" }
    },
    "production": {
      "channel": "production",
      "autoIncrement": true,
      "ios": {},
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "you@example.com", "ascAppId": "TBD", "appleTeamId": "TBD" },
      "android": { "serviceAccountKeyPath": "./google-play-service-account.json" }
    }
  }
}
```

[CITED: docs.expo.dev/build/eas-json]

### `.env.example` (committed)

```
# Firebase Web SDK config — NOT secrets; identify Firebase project.
# See https://firebase.google.com/docs/projects/api-keys
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=chitti-app-edfb1.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=chitti-app-edfb1
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=chitti-app-edfb1.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=447142533670
EXPO_PUBLIC_FIREBASE_APP_ID=1:447142533670:web:06d96ae14bfab70e3164e7

# Local paths for native config files (gitignored; in EAS use EAS secrets instead).
GOOGLE_SERVICES_JSON=./google-services.json
GOOGLE_SERVICE_INFO_PLIST=./GoogleService-Info.plist
```

Commit this file. Real values go in `.env` (gitignored).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Firebase JS SDK `RecaptchaVerifier` on RN | `@react-native-firebase/auth` native module | Long-standing; Pitfall 7 documents this | LOCKED for Phase 1 |
| `expo-firebase-recaptcha` | Deprecated; use native RNFirebase | ~2023 | Not an option |
| Hardcoded Firebase config | `EXPO_PUBLIC_*` env + `Constants.expoConfig.extra` | Expo SDK 49+ standardized this | Phase 1 lands this |
| `useFrameworks: "static"` alone | `useFrameworks: "static"` + `forceStaticLinking` | RN 0.84 / Expo SDK 54 | Mandatory for RNFirebase iOS today |
| Expo Go + JS SDK auth | EAS Build dev-client + RNFirebase | This phase | Expo Go dropped |

**Deprecated/outdated:**
- `expo-firebase-recaptcha` — deprecated by Expo.
- `getReactNativePersistence(AsyncStorage)` from `firebase/auth` — still works for JS SDK path but unnecessary on RNFirebase native. Don't add.

## DLT-SMS Decision Resolution (RESOLVING THE OPEN QUESTION)

### Recommendation: **Option (a) — Firebase default is acceptable for v1. DLT integration becomes v1.x.**

### Findings

**1. Is Firebase Phone Auth DLT-compliant in 2026?**

No. Firebase Phone Auth routes SMS through Google's own infrastructure. Google does not publish a DLT registration for the Firebase OTP path on Indian carriers. Indian carrier filters silently drop a non-trivial fraction of non-DLT SMS as "promotional spam" — particularly Jio and BSNL. Average delivery on DLT-registered routes is <3s P50, <8s P95; Firebase's default path is empirically worse but no first-party number exists. [CITED: messagecentral.com, webxion.com, springedge.com — multiple India SMS provider sources]

**2. What does TRAI require for transactional SMS like OTPs in 2026?**

TRAI's DLT framework (in force since 2020, tightened with the Feb 12, 2025 amendments adding `-P / -S / -T / -G` category suffixes, biometric registration, honeypot deployment) requires:
- **Principal Entity registration** on a DLT portal (Airtel SmartPing / Jio / Vi / BSNL). Pay ~₹5,900 + GST one-time.
- **Header (Sender ID) registration.** 6-character alphanumeric.
- **Template approval** for every OTP / transactional message body.

Without all three, "the message simply never arrives" — TRAI requires carriers to silently drop non-compliant traffic. [CITED: webxion.com, smsidea.com]

**3. Will Apple App Store / Google Play reject for using non-DLT Firebase OTP?**

No. Neither store gates submission on DLT compliance — that's a TRAI / carrier matter, not a store-policy matter. PITFALLS.md Pitfalls 12 + 13 cover the store policies and DLT is not in either. The deliverability hit affects user experience, not store approval.

**4. Cost / setup comparison for v1.1 provider integration**

| Provider | Setup cost | Per-SMS cost (IN) | DLT help | Custom-token integration |
|----------|-----------|-------------------|----------|--------------------------|
| MSG91 | DLT-only fees (~₹5,900 entity); MSG91 onboarding free | ~₹0.18–0.25 transactional | Strong (hands-on guides) | Yes — Firebase `signInWithCustomToken` via Cloud Function recipe is well-documented |
| Twilio Verify | Twilio account free; extra carrier+DLT fees layered on India routes | ~₹0.40–0.60 effective (Twilio markup + DLT) | Self-serve docs; less India-specific hand-holding | Yes — same pattern |
| Karix (Tanla) | Enterprise onboarding (slow); strong DLT ops via Tanla | Negotiated, typically the cheapest at high volume | Strong | Yes |

**Recommendation when v1.1 lands:** **MSG91.** India-cheapest for SMB volume, dedicated DLT onboarding support, well-documented Firebase custom-token recipe. Switch to Karix only if monthly volume justifies enterprise sales motion.

### Why defer to v1.x

- **Cost / time of full integration:** ~₹5,900 + GST entity registration, 2–4 weeks for header + template approval on multiple carriers, MSG91 onboarding, Cloud Function dev for `signInWithCustomToken` flow, end-to-end testing. Easily a 2-week side-phase for an MVP that has no users yet.
- **No real users:** Pre-launch beta. Firebase's default route + voice-OTP fallback covers the testing audience (the project team + early Lalith-Parsi/ChittiApp collaborators). DLT pain shows up at scale.
- **App Store / Play submission unaffected:** Stores don't require DLT.
- **The UI already accommodates the fallback:** "Call me instead" button exists in LoginScreen.tsx. Voice OTP bypasses SMS filters.

### Revisit triggers (move to v1.x when ANY of these hit)

1. Beta-tester conversion from "phone entered" to "OTP entered" drops below 80%, OR
2. >1 support report of "didn't get OTP" from a Jio / BSNL user, OR
3. Total monthly SMS volume crosses ~500 (free tier safety margin), OR
4. v1 has shipped to App Store / Play Store and active foreman count exceeds 20 — beyond that, retention is the priority and SMS reliability becomes the bottleneck.

When triggered: add `.planning/phases/0X-dlt-sms-provider/` with scope = MSG91 integration via Cloud Function + `signInWithCustomToken`. Estimated effort: 1 week dev + 2–4 weeks for DLT template approval lead time.

## Open Questions

1. **Firebase test phone numbers — exact list and quota.**
   - What we know: Firebase allows up to 10 test numbers per project; each has a fixed OTP. Doesn't burn the 3000/day quota.
   - What's unclear: How many real test numbers does the team need before phase verification? Probably 2–3 (one Jio, one Airtel SIM owner each).
   - Recommendation: Configure 3 test numbers (`+91 90000 00001`, `+91 90000 00002`, `+91 90000 00003` with fixed OTPs `123456`, `234567`, `345678`) for dev iteration. Real-device verification still requires real SIMs.

2. **EAS Build account ownership.**
   - What we know: STATE.md mentions push access via `kbreddiee` collaborator role. Expo account ownership for EAS not stated.
   - What's unclear: Whose Expo account hosts the EAS project? Free tier (15 iOS + 15 Android builds/month) per account.
   - Recommendation: Phase 1 plan should include a task "create / link Expo account for EAS, set `projectId` in `app.config.ts`'s `extra.eas.projectId`."

3. **Dev vs prod Firebase projects — single or split?**
   - What we know: One project (`chitti-app-edfb1`) exists. API key publicly committed.
   - What's unclear: Is "dev = same project with test phone numbers; prod = new clean project" the intent, or are we staying on one project?
   - Recommendation: Phase 1 stays on `chitti-app-edfb1` (rotate the API key after env config lands — STATE.md "Pending Todos"). Phase 6 (STORE-04 / store submission) is when a clean production Firebase project should be provisioned with proper App Check, security rules, no test numbers. Document this in the plan as "production Firebase project: deferred to Phase 6."

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Local dev + EAS Build | ✓ (assumed; not pinned via .nvmrc per STACK.md) | unspecified | — |
| npm | Package install | ✓ | (matches Node) | — |
| Expo CLI | `npx expo start` / `install` | ✓ via `npx` | — | — |
| `eas-cli` | EAS Build / Submit | ✗ (not in package.json) | — | Install globally or use `npx eas-cli` |
| Expo account + EAS project | EAS Build | ✗ (not yet linked) | — | Must create / link in Phase 1 |
| Apple Developer account | iOS builds via EAS | unknown (not in repo) | — | **Blocking** — must exist for iOS preview/production. |
| Google Play Developer account + service account JSON | Android builds via EAS | unknown | — | Blocking for `eas submit` Android; not blocking for `eas build` Android (APK signing works without). |
| Firebase Console access for `chitti-app-edfb1` | Add test phone numbers, enable Phone Auth, download `google-services.json` / `GoogleService-Info.plist`, add Android SHA fingerprints, upload APN key for iOS | unknown — likely owned by `kbreddiee` or original creator | — | Required. |
| Physical iPhone (iOS 17+) with Indian SIM | AUTH-01 verification | unknown | — | **Blocking AUTH-01.** No software fallback. |
| Physical Android (Pixel/Samsung, Android 13+) with Indian SIM | AUTH-02 verification | unknown | — | **Blocking AUTH-02.** No software fallback. |

**Missing dependencies with no fallback:**
- Apple Developer account (iOS prod build).
- Physical iOS + Android devices with Indian SIMs (AUTH-01/02 hard gate).

**Missing dependencies with fallback:**
- `eas-cli` — `npx eas-cli` works without global install.
- Google Play developer account — only blocks `eas submit`; `eas build` works without it.

## Validation Architecture

(workflow.nyquist_validation not explicitly false in `.planning/config.json`'s observed state — STATE.md shows `nyquist_validation ✓`, so this section is required.)

### Test Framework

| Property | Value |
|----------|-------|
| Framework | **None currently installed** (STACK.md: "no test framework, no test files, no test scripts in package.json") |
| Config file | none — Wave 0 must add Jest + `jest-expo` preset |
| Quick run command | `npm test -- --testPathPattern=phone` (after Wave 0) |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Sign in via OTP on physical iOS | manual-only (real SIM, real device) | manual — see §8 checklist | N/A (manual) |
| AUTH-02 | Sign in via OTP on physical Android | manual-only | manual — see §8 checklist | N/A |
| AUTH-03 | Session persists across cold start | manual-only (force-quit + relaunch on device) | manual — see §8 checklist | N/A |
| AUTH-04 | Sign out returns to OTP screen | manual + smoke unit (AuthContext state change) | `npm test -- AuthContext` | ❌ Wave 0 |
| DATA-04 | Firebase config supplied via env, no hardcoded keys in firebase.ts | unit + lint | `npm test -- firebase-config` + `npm run lint` (grep for hardcoded apiKey) | ❌ Wave 0 |
| (helper) | `toE164` correctly parses Indian numbers | unit | `npm test -- phone` | ❌ Wave 0 |
| (helper) | `Paisa` arithmetic preserves invariant | unit (property-based-ish) | `npm test -- money` | ❌ Wave 0 |
| (lint) | No `'+91' + ` concatenation in src | lint | `npm run lint` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run lint && npm test -- --bail` (unit tests; <30s target).
- **Per wave merge:** `npm test` (full suite) + a manual demo-mode smoke on one platform.
- **Phase gate:** Full unit suite green + the §8 manual matrix complete on both physical iOS and Android.

### Wave 0 Gaps

- [ ] `package.json` — add `"test": "jest"`, `"lint": "eslint src --max-warnings=0"` scripts.
- [ ] `jest.config.js` — `preset: 'jest-expo'`, `testPathIgnorePatterns: ['/node_modules/', '/.expo/']`.
- [ ] Install: `npm install --save-dev jest jest-expo @types/jest eslint @react-native/eslint-config`.
- [ ] `tests/phone.test.ts` — covers `toE164`, `isValidIndianMobile`, `formatNational` (10-digit, 11-digit, +91-prefixed, +44, garbage input).
- [ ] `tests/money.test.ts` — `paisa(123.456) === 12346`, `toRupees(paisa(50)) === 50`, `addPaisa`/`subPaisa` invariant.
- [ ] `tests/firebase-config.test.ts` — mocks `Constants.expoConfig` and asserts `firebase.ts` throws with helpful message when keys missing.
- [ ] `.eslintrc.js` — the no-restricted-syntax rule from Pattern 6.

## Security Domain

`security_enforcement` is not explicitly disabled in observed config — section included.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Firebase Phone Auth via RNFirebase; OTP entropy (6 digits) and rate limits managed by Firebase |
| V3 Session Management | yes | RNFirebase native session persistence (iOS Keychain / Android SharedPreferences); token refresh handled by SDK |
| V4 Access Control | partial (Phase 2) | Firestore security rules — out of scope this phase but Phase 1 must not regress |
| V5 Input Validation | yes | `libphonenumber-js` for phone; lint rule for `'+91' + ` concat |
| V6 Cryptography | yes (delegated) | Never hand-roll. Firebase + native OS keystore handle token storage. |
| V8 Data Protection | yes | Firebase web API key is not a secret; `google-services.json` and `GoogleService-Info.plist` gitignored; EAS secrets for prod |
| V14 Configuration | yes | Env-driven config (DATA-04); separate dev/prod profiles via `eas.json` `env` blocks and `eas secret` for prod keys |

### Known Threat Patterns for native phone auth on Expo + Firebase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| OTP brute force | Spoofing | Firebase enforces per-phone + per-IP rate limits (50/min/IP, 500/hr/IP, 3000/day global on Spark tier). Don't disable. |
| Recaptcha / Play Integrity bypass | Spoofing | RNFirebase relies on native Play Integrity (Android) / DeviceCheck (iOS) for anti-abuse. Don't toggle `appVerificationDisabledForTesting=true` in production code paths. |
| Token theft from device | Tampering | Native Keychain (iOS) / Encrypted SharedPrefs (Android) — automatic via RNFirebase. Don't write tokens to AsyncStorage. |
| Hardcoded API key leakage | Information Disclosure | Firebase web API key is project-identifier, not a secret. Real security = Firestore rules + App Check (Phase 2+). The existing leak on GitHub is acceptable, but **rotate after Phase 1** per STATE.md. |
| Demo mode bypass | Elevation of Privilege | Demo mode is local in-memory only — `__demoMode` flag in AuthContext gates storage shim. Verify Phase 1 changes don't accidentally write demo data to real Firestore. |
| `recaptcha-container` View leaving DOM hooks behind | Tampering (legacy) | Remove the View and `(window as any).recaptchaVerifier` write completely. |

## Migration Sequence (CONFIRMED with one refinement)

The user's proposed order is **almost** right. One change: **steps 1 and 3 must merge** because `app.config.ts` is the only place the RNFirebase config plugin lives, and we don't want to commit a half-state `app.json` + half-state `app.config.ts`.

**Confirmed order:**

1. **Wave 0 — Test infra:** Install Jest + ESLint, write the test scaffolds and the lint rule. (Independent.)
2. **Wave 1 — Config + deps (combined):**
   - Install `@react-native-firebase/app`, `@react-native-firebase/auth`, `expo-dev-client`, `expo-build-properties`, `libphonenumber-js`, `eas-cli`.
   - Delete `app.json`; create `app.config.ts` with config plugin + `extra.firebase` from env.
   - Create `.env`, `.env.example`.
   - Rewrite `src/lib/firebase.ts` to read from `Constants.expoConfig.extra` (DATA-04 lands here).
   - Add `GoogleService-Info.plist` + `google-services.json` (from Firebase Console download) — gitignore both. Add as EAS secrets for production profile.
   - **Why merged:** EAS Build needs both the plugin entries AND `extra.firebase` populated. Splitting risks an intermediate broken build state.
3. **Wave 2 — Helpers (parallel-safe):**
   - Add `src/utils/phone.ts` + tests.
   - Add `src/utils/money.ts` + tests.
   - Wire `toE164` into `LoginScreen.tsx` (phone-entry validation) and `AddMemberScreen.tsx` (normalize on save).
4. **Wave 3 — Auth swap:**
   - Add `eas.json` with three profiles.
   - First `eas build --profile development --platform ios` + `--platform android` — verifies the native module + config plugin chain.
   - Update `AuthContext.tsx` import from `firebase/auth` → `@react-native-firebase/auth`.
   - Rewrite `LoginScreen.sendOTP()` / `verifyOTP()` using `auth().signInWithPhoneNumber()`.
   - Remove `recaptcha-container` View + `(window as any).recaptchaVerifier`.
   - Install dev-client builds on physical devices.
5. **Wave 4 — Verification matrix (§8):**
   - Real-device test on iPhone (Jio or Airtel SIM).
   - Real-device test on Android (Jio or Airtel SIM).
   - Cold-start persistence test on both.
   - Sign-out test on both.
   - Demo-mode regression test on both.
6. **Wave 5 — Hardening:**
   - First `eas build --profile preview` (release build) on both platforms — confirms production-mode native auth works.
   - First `eas build --profile production` — confirms store-ready binary builds.
   - Rotate Firebase API key (STATE.md "Pending Todos") — update `.env` and EAS secrets.
   - Document in `STACK.md` that RNFirebase is the auth path.

**Rationale for revision:** Putting env config (DATA-04) *before* RNFirebase install would mean writing `app.config.ts` without its primary plugin entries, then immediately rewriting it. Combining keeps the file edited once. The phases stay decoupled in intent (config and SDK swap are separable concerns) but ship together for build cleanliness.

## Sources

### Primary (HIGH confidence)
- [React Native Firebase docs (rnfirebase.io)](https://rnfirebase.io/) — install commands, plugin array, `forceStaticLinking` config
- [Expo — Configure EAS Build with eas.json](https://docs.expo.dev/build/eas-json/) — three-profile default
- [Expo — Using Firebase guide](https://docs.expo.dev/guides/using-firebase/) — directs to RNFirebase for native auth
- [Firebase Phone Auth — Web SDK reference](https://firebase.google.com/docs/auth/web/phone-auth) — API surface (same JS shape as RNFirebase confirmation.confirm)
- [Firebase Authentication limits](https://firebase.google.com/docs/auth/limits) — 3000 SMS/day Spark, 50/min/IP, 500/hr/IP
- [Firebase Local Emulator Suite — Auth](https://firebase.google.com/docs/emulator-suite/connect_auth) — Phone Auth emulator behavior (codes to stdout, no real SMS)
- [libphonenumber-js npm + GitHub](https://www.npmjs.com/package/libphonenumber-js) — `min` build ~110 KB, E.164 support
- npm registry: `@react-native-firebase/app@24.0.0`, `@react-native-firebase/auth@24.0.0`, `libphonenumber-js@1.13.3`, `expo-dev-client@56.0.15`, `eas-cli@19.0.8` — verified via `npm view` on 2026-05-23

### Secondary (MEDIUM confidence)
- [Message Central — India SMS Regulations 2026](https://www.messagecentral.com/sms-guideline/india) — TRAI DLT scope and enforcement
- [Webxion — DLT Compliance for Bulk SMS in India 2026](https://www.webxion.com/dlt-compliance-for-bulk-sms-in-india/) — registration cost, three-component requirement, silent drop behavior
- [SMS Idea — DLT Compliance 2026](https://smsidea.com/blog/dlt-compliance-for-bulk-sms-india/) — Feb 2025 amendments, P/S/T/G suffix system
- [Tech to Networks — Top India OTP providers comparison](https://www.techtonetworks.com/post/top-sms-otp-providers-in-india-a-complete-comparison-guide) — MSG91 vs Twilio vs Karix
- [DevOps School — Top global & India SMS/OTP providers](https://www.devopsschool.com/blog/top-global-india-based-business-sms-otp-providers/) — pricing benchmarks
- [GitHub: invertase/react-native-firebase#8657](https://github.com/invertase/react-native-firebase/issues/8657) — RN 0.84+ static-linking fix demonstration
- [GitHub: expo/expo#39607](https://github.com/expo/expo/issues/39607) — non-modular header errors and `forceStaticLinking` resolution
- [Expo Pricing](https://expo.dev/pricing) and [EAS Build Limitations](https://docs.expo.dev/build-reference/limitations/) — free tier 30 builds/month, 45-min timeout

### Tertiary (LOW confidence)
- India SMS deliverability empirical numbers (~5–15% drop rate for non-DLT) — no first-party Firebase statement; aggregated from multiple India SMS provider marketing pages. Treat as directional, not authoritative.

## Project Constraints (from CLAUDE.md / AGENTS.md)

- **Expo SDK 56 is pinned.** Read the Expo v56 versioned docs (https://docs.expo.dev/versions/v56.0.0/) before writing any code. This phase's research is grounded in SDK 56 specifics.
- Dependency selections in this RESEARCH.md respect the SDK 56 pinning — all versions (RNFirebase ^24, expo-dev-client ~56.0.15, expo-build-properties Expo 56 compatible) are chosen for SDK 56 compatibility.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | India SMS drop rate of ~5–15% for non-DLT Firebase OTP | §4, Pitfall E | If much higher in 2026, may force v1.x → in-Phase-1. Mitigation: voice-OTP fallback works regardless. |
| A2 | App Store / Play Store don't gate on DLT compliance | §4 | If wrong, Phase 6 would re-open this. PITFALLS.md Pitfalls 12/13 don't list DLT. |
| A3 | RNFirebase v24.x is compatible with Expo SDK 56 / RN 0.85.3 | §1, Standard Stack | If incompatible, may need RNFirebase v23 or wait for v25. Mitigation: test EAS build early in the phase. |
| A4 | EAS free tier (15+15 builds/month) is sufficient for Phase 1 | §2 | If build iteration explodes, may need to upgrade or buy build credits. |
| A5 | `forceStaticLinking: ['RNFBApp', 'RNFBAuth']` is the correct minimal set | §1 | If incorrect, iOS build fails — add more module names. Low risk; well-documented pattern. |
| A6 | Firebase web API key is acceptable to commit in `.env.example` (it's not a secret) | §3 | Standard Firebase guidance. App Check + Firestore rules are the actual auth boundary. |
| A7 | Existing `firebase` JS SDK dep stays — RNFirebase replaces auth only, Firestore stays JS SDK for now | §1, Runtime State Inventory | Phase 2 re-evaluates. Mixed-SDK is officially supported by Firebase but bundle bloat is a concern. |

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified via `npm view`, plugin shape verified against rnfirebase.io
- Architecture: HIGH — matches official RNFirebase + Expo docs
- DLT decision: HIGH on landscape (multiple India source corroboration), MEDIUM on store-policy implication (PITFALLS.md cross-check confirms)
- Pitfalls: HIGH — cross-referenced with PITFALLS.md Pitfalls 1, 6, 7, 8
- India SMS drop rate quantification: LOW — directional only

**Research date:** 2026-05-23
**Valid until:** 2026-06-22 (30 days) for the stack pieces; revisit DLT landscape annually or on first user complaint.
