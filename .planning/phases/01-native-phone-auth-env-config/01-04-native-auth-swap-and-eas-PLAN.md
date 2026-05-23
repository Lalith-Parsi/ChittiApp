---
phase: 01-native-phone-auth-env-config
plan: 04
type: execute
wave: 3
depends_on: [02, 03]
files_modified:
  - eas.json
  - src/lib/AuthContext.tsx
  - src/lib/firebase.ts
  - src/screens/LoginScreen.tsx
  - src/storage/index.ts
autonomous: true
requirements: [AUTH-03, AUTH-04]
must_haves:
  truths:
    - "AuthContext imports auth from '@react-native-firebase/auth', not from 'firebase/auth' or '../lib/firebase'"
    - "LoginScreen sendOTP uses auth().signInWithPhoneNumber(e164); no RecaptchaVerifier, no '+91' template, no window.recaptchaVerifier write"
    - "The View nativeID='recaptcha-container' element is removed from LoginScreen JSX"
    - "Demo mode still short-circuits real auth (__demoMode export + DEMO_USER unchanged)"
    - "AUTH-03 holds in code: RNFirebase native session persistence; no getReactNativePersistence wiring added"
    - "AUTH-04 holds in code: auth().signOut() is the sole sign-out path; onAuthStateChanged fires user=null"
  artifacts:
    - path: eas.json
      provides: "Three build profiles (development/preview/production) with EXPO_PUBLIC_FIREBASE_* env wiring"
    - path: src/lib/AuthContext.tsx
      provides: "Auth state machine on @react-native-firebase/auth; AppUser shape (uid, phoneNumber, isDemo) preserved"
    - path: src/screens/LoginScreen.tsx
      provides: "Native phone-OTP flow via auth().signInWithPhoneNumber + confirmation.confirm; toE164 normalization at entry; mapPhoneAuthError"
    - path: src/lib/firebase.ts
      provides: "TEMP auth export from Plan 02 removed; only db + default app exported"
  key_links:
    - from: src/lib/AuthContext.tsx
      to: "@react-native-firebase/auth"
      via: "default import; auth().onAuthStateChanged(); auth().signOut()"
      pattern: "from '@react-native-firebase/auth'"
    - from: src/screens/LoginScreen.tsx
      to: src/utils/phone.ts
      via: "toE164(phoneDisplay,'IN') before auth().signInWithPhoneNumber"
      pattern: "toE164\\("
    - from: src/screens/LoginScreen.tsx
      to: "@react-native-firebase/auth"
      via: "auth().signInWithPhoneNumber(e164) + confirmation.confirm(code)"
      pattern: "signInWithPhoneNumber\\("
---

<objective>
The auth swap itself. Replace the JS-SDK web-only `RecaptchaVerifier` + `signInWithPhoneNumber` chain with native `@react-native-firebase/auth` calls. Wire `toE164` from Plan 03 into LoginScreen's entry point. Add `eas.json` with three profiles. Closes the in-code work for AUTH-03 (persistence is automatic on RNFirebase) and AUTH-04 (sign-out path). AUTH-01 and AUTH-02 require physical-device verification — Plan 05 owns that.

Per CONTEXT.md: keep all UI components, state machine, toasts, and the demo-mode short-circuit unchanged. Only the API calls inside `sendOTP()`, `verifyOTP()`, and `AuthContext.useEffect` change. Per RESEARCH Anti-Pattern, DO NOT add `getReactNativePersistence` — RNFirebase auto-persists.

Purpose: the app's auth backend now actually works on a real iOS or Android device with a real SIM. The web reCAPTCHA dead-end is gone.
Output: a dev-client-buildable codebase where auth flows through native modules; Plan 05 builds + verifies on hardware.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/01-native-phone-auth-env-config/01-CONTEXT.md
@.planning/phases/01-native-phone-auth-env-config/01-RESEARCH.md
@.planning/research/PITFALLS.md
@src/lib/AuthContext.tsx
@src/lib/firebase.ts
@src/screens/LoginScreen.tsx
@src/storage/index.ts
@.planning/phases/01-native-phone-auth-env-config/01-02-SUMMARY.md
@.planning/phases/01-native-phone-auth-env-config/01-03-SUMMARY.md
@AGENTS.md
</context>

<interfaces>
After this plan:
```ts
// src/lib/AuthContext.tsx
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
type User = FirebaseAuthTypes.User;
// auth().onAuthStateChanged(u => ...) replaces onAuthStateChanged(authJs, ...)
// auth().signOut() replaces signOut(authJs)
// AppUser shape unchanged: { uid, phoneNumber, isDemo }
// __demoMode export unchanged (src/storage/index.ts reads it)

// src/screens/LoginScreen.tsx — sendOTP
const e164 = toE164(phoneDisplay, 'IN');
const confirmation = await auth().signInWithPhoneNumber(e164);
// verifyOTP
await confirmation.confirm(code);
```
`src/storage/index.ts` reads `auth.currentUser` — must keep working. RNFirebase's `auth().currentUser` mirrors the JS-SDK shape (uid, phoneNumber). Update the import there.
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Create eas.json with three build profiles</name>
  <read_first>
    - .planning/phases/01-native-phone-auth-env-config/01-RESEARCH.md the "Minimal eas.json" code example (verbatim template)
    - .planning/phases/01-native-phone-auth-env-config/01-CONTEXT.md "EAS Build setup [LOCKED]"
    - .env.example (env-var names canonicalized by Plan 02)
  </read_first>
  <action>
    Create `eas.json` at repo root per RESEARCH's minimal-eas.json example. Three profiles: `development` (developmentClient true, distribution internal, ios.simulator false, android.buildType apk), `preview` (release build, internal distribution, apk on Android), `production` (channel production, autoIncrement true, android.buildType app-bundle). Wire `env` blocks for EXPO_PUBLIC_FIREBASE_* in `development` referencing EAS secret names. Leave `submit.production` entries with `TBD` placeholders for appleId / ascAppId / appleTeamId (store-submission credentials are Phase 6 territory). Do NOT run `eas build` yet — Plan 05 owns that.
  </action>
  <verify>
    <automated>node -e "const c=require('./eas.json'); const need=['development','preview','production']; const miss=need.filter(n=>!c.build[n]); if(miss.length){console.error('Missing profiles:',miss); process.exit(1)} if(!c.build.development.developmentClient) process.exit(2); if(c.build.production.android.buildType!=='app-bundle') process.exit(3); console.log('eas.json OK')"</automated>
  </verify>
  <acceptance_criteria>
    - `eas.json` exists and parses as valid JSON.
    - `build.development`, `build.preview`, `build.production` all defined.
    - `build.development.developmentClient === true`.
    - `build.production.android.buildType === 'app-bundle'`.
    - `cli.version` field present and constraint is `>= 19.0.0`.
  </acceptance_criteria>
  <done>EAS configuration ready for Plan 05's three build invocations.</done>
</task>

<task type="auto">
  <name>Task 2: Swap AuthContext + src/storage/index.ts to @react-native-firebase/auth; preserve demo mode</name>
  <read_first>
    - src/lib/AuthContext.tsx (full file — only imports + onAuthStateChanged callsite + signOut callsite change)
    - .planning/phases/01-native-phone-auth-env-config/01-RESEARCH.md "Cold-start auth check" code example
    - src/storage/index.ts (uses `auth.currentUser`; update its import only)
    - tests/auth-context.test.ts (Plan 01 red scaffold to satisfy)
  </read_first>
  <action>
    In `src/lib/AuthContext.tsx`: replace `import { onAuthStateChanged, signOut, User } from 'firebase/auth'` with `import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth'` plus `type User = FirebaseAuthTypes.User`. Remove `import { auth } from './firebase'` entirely (RNFirebase `auth()` is a singleton accessor). Change the `useEffect` body to `auth().onAuthStateChanged(u => { setFirebaseUser(u); setLoading(false); })`. Change the `signOut(auth)` call inside `leaveDemoMode` to `auth().signOut()`. Preserve every other line: `__demoMode` export, `AppUser` shape, `DEMO_USER`, `enterDemoMode`, the demoActive branch in the rendered context value.
    In `src/storage/index.ts`: if the file imports `auth` from `../lib/firebase`, change that import to `import auth from '@react-native-firebase/auth'` and rewrite `auth.currentUser` references to `auth().currentUser` (RNFirebase mirrors `.uid` and `.phoneNumber` on the currentUser object — see RESEARCH "Cold-start auth check"). Do NOT change any other behavior in storage/index.ts.
    Make `tests/auth-context.test.ts` green by ensuring export surface (`AuthProvider`, `useAuth`, `__demoMode`) is preserved.
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const a=fs.readFileSync('src/lib/AuthContext.tsx','utf8'); if(!/from '@react-native-firebase\/auth'/.test(a)) process.exit(1); if(/from 'firebase\/auth'/.test(a)) process.exit(2); if(/from '\.\/firebase'/.test(a)) process.exit(3); if(!/__demoMode/.test(a)) process.exit(4); if(!/DEMO_USER/.test(a)) process.exit(5); console.log('AuthContext swap OK')"; npm test -- tests/auth-context.test.ts 2>&amp;1 | grep -E "PASS|FAIL" | head -3; npx tsc --noEmit 2>&amp;1 | tail -10</automated>
  </verify>
  <acceptance_criteria>
    - `src/lib/AuthContext.tsx` imports `auth` from `@react-native-firebase/auth` and does NOT import from `firebase/auth` or from `./firebase`.
    - `__demoMode` is still exported from `src/lib/AuthContext.tsx`.
    - `DEMO_USER` object is unchanged (`{ uid: 'demo-user', phoneNumber: '+91 98765 43210', isDemo: true }`).
    - `npm test -- tests/auth-context.test.ts` PASSES.
    - `npx tsc --noEmit` exits 0 (no type errors project-wide).
    - `src/storage/index.ts` does not import `auth` from `../lib/firebase` (it may still import `db`).
  </acceptance_criteria>
  <done>AuthContext runs on RNFirebase; demo path untouched; storage shim's `auth.currentUser` contract preserved via new import.</done>
</task>

<task type="auto">
  <name>Task 3: Rewrite LoginScreen sendOTP/verifyOTP; remove recaptcha-container; remove TEMP auth export from firebase.ts</name>
  <read_first>
    - src/screens/LoginScreen.tsx (full file — locate sendOTP, verifyOTP, `<View nativeID="recaptcha-container" />` JSX, `(window as any).recaptchaVerifier` write, the `+91${digits}` template at ~line 198)
    - .planning/phases/01-native-phone-auth-env-config/01-RESEARCH.md "Pattern 3: Rewritten sendOTP/verifyOTP in LoginScreen.tsx" (before/after diff) AND "Error mapping for LoginScreen" (mapPhoneAuthError function)
    - .planning/research/PITFALLS.md Pitfall 8 ("Didn't receive OTP?" UX — voice-OTP fallback)
    - src/utils/phone.ts (Plan 03 — toE164 import shape)
    - src/lib/firebase.ts (Plan 02 — TEMP `auth` export marked "TEMP: removed in Plan 01-03")
  </read_first>
  <action>
    In `src/screens/LoginScreen.tsx`:
    1. Replace imports: remove `RecaptchaVerifier`, `signInWithPhoneNumber`, `ConfirmationResult` from `firebase/auth`; remove `import { auth } from '../lib/firebase'`. Add `import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth'` and `import { toE164 } from '../utils/phone'`.
    2. In `sendOTP`: compute `const e164 = toE164(phoneDisplay, 'IN')`; if null set the existing invalid-phone error state and return; then `const confirmation: FirebaseAuthTypes.ConfirmationResult = await auth().signInWithPhoneNumber(e164); setConfirmation(confirmation);` Keep `setStep('otp')`, `setSecondsLeft(...)`, toast wiring unchanged. Remove the `(window as any).recaptchaVerifier` block entirely.
    3. In `verifyOTP`: keep `await confirmation.confirm(code)` (same API on RNFirebase). The AuthContext listener picks up the user.
    4. Add `mapPhoneAuthError(e)` helper inside the file per RESEARCH "Error mapping" — maps RNFirebase error codes (`auth/invalid-phone-number`, `auth/too-many-requests`, etc.) to the existing UI error states.
    5. Delete the `<View nativeID="recaptcha-container" />` JSX line (~line 199).
    6. Keep the "Call me instead" voice-OTP button (Pitfall 8); if its handler currently uses the JS SDK, rewire to call `auth().signInWithPhoneNumber(e164, /* forceResend */ true)` or rely on Firebase's auto voice-fallback. Pick one approach per Claude's discretion and note the choice in SUMMARY.
    7. In `src/lib/firebase.ts`: remove the TEMP `auth` export and the `getAuth` import (the `// TEMP: removed in Plan 01-03` marker added by Plan 02). Keep `db` and the default `app` export. Re-run `npm test -- tests/firebase-config.test.ts` to confirm DATA-04 stays green.
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const s=fs.readFileSync('src/screens/LoginScreen.tsx','utf8'); const checks={ no_recaptcha_class: !/RecaptchaVerifier/.test(s), no_recaptcha_view: !/recaptcha-container/.test(s), no_plus91_concat: !/'\\+91'\\s*\\+/.test(s) &amp;&amp; !/`\\+91\\$\\{/.test(s), uses_rnfb: /auth\\(\\)\\.signInWithPhoneNumber/.test(s), uses_toE164: /toE164\\(/.test(s), has_mapper: /mapPhoneAuthError/.test(s) }; const f=Object.entries(checks).filter(([_,v])=>!v); if(f.length){console.error('FAIL:',f); process.exit(1)} console.log('LoginScreen swap OK')"; node -e "const fs=require('fs'); const f=fs.readFileSync('src/lib/firebase.ts','utf8'); if(/export const auth/.test(f)) process.exit(1); if(/getAuth/.test(f)) process.exit(2); if(!/export const db/.test(f)) process.exit(3); console.log('firebase.ts TEMP removed OK')"; npm run lint -- src/screens/LoginScreen.tsx 2>&amp;1 | tail -5; npm test 2>&amp;1 | grep -E "Tests:" | tail -3; npx tsc --noEmit 2>&amp;1 | tail -10</automated>
  </verify>
  <acceptance_criteria>
    - `src/screens/LoginScreen.tsx` contains NO `RecaptchaVerifier`, NO `recaptcha-container`, NO `'+91' +` concat, NO `` `+91${`` template.
    - `src/screens/LoginScreen.tsx` contains `auth().signInWithPhoneNumber(`, `toE164(`, and `mapPhoneAuthError`.
    - `src/lib/firebase.ts` no longer exports `auth` and no longer imports `getAuth`; still exports `db`.
    - `npm run lint -- src/screens/LoginScreen.tsx` exits 0 (Pitfall 6 rule satisfied — the legacy concat is gone).
    - Full test suite: zero failures attributable to import/type errors (`npx tsc --noEmit` exits 0).
    - `tests/firebase-config.test.ts` still PASSES.
  </acceptance_criteria>
  <done>The auth backend is fully native. Web reCAPTCHA dead-end is gone. The codebase is in the state Plan 05 needs to build dev-client binaries and verify on hardware.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` exits 0.
- `npm run lint` exits 0 (or non-zero only for files outside this plan's scope; the legacy `+91` flag against LoginScreen.tsx from Plan 01 is now cleared).
- `npm test` runs the Plan 01 scaffolds plus phone/money/firebase-config/auth-context — all GREEN (excluding manual-only AUTH-01/02/03 gates).
- Demo-mode rendering of `LoginScreen` still works (smoke-tested in Plan 05 on physical device; component renders without throwing here).
</verification>

<success_criteria>
AUTH-03 and AUTH-04 are code-complete. The app boots on RNFirebase. Plan 05 can now run `eas build --profile development` for both platforms and verify on physical devices.
</success_criteria>

<output>
After completion, create `.planning/phases/01-native-phone-auth-env-config/01-04-SUMMARY.md`. Include: import-swap counts (before/after), files where `RecaptchaVerifier` was removed, which voice-OTP fallback strategy was chosen for the "Call me instead" button (with a one-line rationale), and confirmation that `tests/firebase-config.test.ts` and `tests/auth-context.test.ts` are both green.
</output>
