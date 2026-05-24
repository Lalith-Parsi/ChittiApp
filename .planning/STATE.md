---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Phase 1 plan 01-04 (native auth swap + eas.json) complete. AuthContext + LoginScreen + storage + HomeScreen + AddMemberScreen now route through '@react-native-firebase/auth'; web-only RecaptchaVerifier + recaptcha-container removed; LoginScreen wires toE164(phoneDisplay,'IN') -> auth().signInWithPhoneNumber(e164); voice-OTP fallback wired via forceResend=true; mapPhoneAuthError helper added; src/lib/firebase.ts TEMP auth export removed (Firestore-only now). eas.json with 3 build profiles landed. AUTH-03/AUTH-04 code-complete; AUTH-01/02 still owe physical-device verification (Plan 01-05). Native files (GoogleService-Info.plist, google-services.json) remain stubbed — Plan 05 owns the Firebase Console registration + replacement.
last_updated: "2026-05-24T23:30:00.000Z"
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 6
  completed_plans: 4
  percent: 11
---

# STATE — ChittiApp

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-22)

**Core value:** A foreman can run a real Act-1982-compliant chit end-to-end on phones — every subscriber sees their own ledger from their own device — with no spreadsheet, WhatsApp thread, or math errors.
**Current focus:** Phase 01 — native-phone-auth-env-config

## Current Position

Phase: 01 (native-phone-auth-env-config) — EXECUTING
Plan: 5 of 6 (plans 01-01 test-infra + 01-02 config-and-deps [STUBBED] + 01-03 helpers-phone-money + 01-04 native-auth-swap-and-eas complete 2026-05-24; 01-05 device-verification next)
**Workflow:** active project, executing
**Stage:** Phase 1 — Native Phone Auth & Env Config (4 of 6 plans complete)
**Phase:** 1 of 6
**Plan:** next — 01-05-device-verification-PLAN.md

## Progress

```
Initialization:    [██████████] 100%
  PROJECT.md        ✓
  config.json       ✓
  Research          ✓ (DOMAIN + FEATURES + PITFALLS)
  REQUIREMENTS.md   ✓ (43 v1 reqs across 11 categories)
  ROADMAP.md        ✓ (6 phases, mvp/vertical, all 43 reqs mapped)
  STATE.md          ✓

Execution:         [█░░░░░░░░░] 0 / 6 phases formally complete
  Phase 1  ☐  Native Phone Auth & Env Config        ← next to PLAN
                (UI shipped ahead of plan; backend + env still owed)
  Phase 2  ☐  Multi-User Data Model & Security
                (UX-01 native dialogs already shipped)
  Phase 3  ☐  Group Setup & Membership
                (Create / Add Member UIs already shipped, single-user)
  Phase 4  ☐  Cycle Ledger & Payments
                (Payment grid UI already shipped, single-user)
  Phase 5  ☐  Draws + Cycle Math (Money-Conservation)
                (Draw + Receipt UI shipped; MATH-01..04 DONE in code)
  Phase 6  ☐  Store Submission Readiness
```

## What this session shipped (ahead of phase plans)

This session redesigned and re-implemented the entire mobile UI from a Claude Design handoff (committed under `.planning/design-handoff/`). The work cut across multiple phases. Below is the honest accounting:

### Already shipped in code

| Req | Status | Where |
|---|---|---|
| **AUTH-01..02** | Code complete on RNFirebase native; **physical-device verification owed to plan 01-05** | `src/screens/LoginScreen.tsx`, `src/lib/AuthContext.tsx` |
| **AUTH-03** | ✓ Code complete (plan 01-04, 2026-05-24) — RNFirebase native session persistence (iOS Keychain / Android SharedPreferences) automatic; no AsyncStorage wiring needed | `src/lib/AuthContext.tsx` |
| **AUTH-04** | ✓ Code complete (plan 01-04, 2026-05-24) — auth().signOut() in HomeScreen + AuthContext.leaveDemoMode; onAuthStateChanged emits null user (tests/auth-context.test.ts GREEN) | `src/lib/AuthContext.tsx`, `src/screens/HomeScreen.tsx` |
| **DATA-04** | ✓ Done (plan 01-02, 2026-05-24) — firebase.ts reads Constants.expoConfig.extra.firebase; loud-throw on missing keys | `src/lib/firebase.ts`, `app.config.ts`, `.env.example` |
| **GROUP-01** | UI shipped, single-user only | `src/screens/CreateGroupScreen.tsx` |
| **GROUP-02..05, HOME-01..02** | UI shipped, single-user only | `src/screens/GroupDetailScreen.tsx`, `HomeScreen.tsx`, `AddMemberScreen.tsx` |
| **CYCLE-01..04** | UI shipped, single-user only | `src/screens/PaymentTrackingScreen.tsx` |
| **DRAW-01..05** | UI shipped (lottery + auction + manual all live, prized-once + discount-cap enforced) | `src/screens/DrawScreen.tsx` |
| **MATH-01..04** | ✓ **DONE** — foreman commission + invariant + visible equation | `src/utils/chitti.ts`, `MoneyEquation` in `chitti-ui.tsx`, `CycleReceiptScreen.tsx` |
| **VIEW-01..03** | UI shipped (member view is visual-only — no real multi-user data yet) | `GroupDetailScreen.tsx`, `CycleReceiptScreen.tsx` |
| **SOC-01** | Partial — manual phone entry done; `expo-contacts` integration pending | `AddMemberScreen.tsx` |
| **SOC-02** | ✓ Done — `Share` API + wa.me fallback | `CycleReceiptScreen.tsx` |
| **SOC-03** | ✗ NOT done — no audit log writes yet | — |
| **UX-01** | ✓ Done — `window.confirm` removed, `Alert.alert` everywhere | — |
| **UX-02, UX-03** | Partial — native pickers used; haven't validated on physical devices | — |
| **STORE-01..05** | ✗ NOT done — Phase 6 territory | — |

### What this means for Phase 1 planning

Phase 1's UI work is **done**. Phase 1's remaining work is the backend swap-out:

1. Replace web-only `RecaptchaVerifier` + `signInWithPhoneNumber` with native phone auth (decide: `@react-native-firebase/auth` + EAS Build vs Firebase JS SDK + Cloud Function + DLT-SMS). **The Pitfall 7/8 fork.**
2. Move Firebase config (`apiKey`, `projectId`, etc.) out of `src/lib/firebase.ts` and into `app.config.ts` + `expo-constants` from env vars (DATA-04).
3. Add `toE164()` phone normalizer using `libphonenumber-js` (Pitfall 6).
4. Add `Paisa` money primitive helper (Pitfall 1) — though much of the money handling is already integer rupees, this is now a smaller hardening pass than originally planned.
5. Verify native OTP on physical iOS + Android (Indian SIM).

### Bonus shipped this session (not roadmap-tracked)

- **Demo mode** + in-memory storage (`src/storage/demo.ts`) with 3 seeded chits in different lifecycle states — `Lalith-Parsi/ChittiApp` collaborators can preview the app without auth via the "Preview without signing in →" button.
- **Toast feedback** (`src/lib/ToastContext.tsx`) wired across Create chit / Add member / Mark paid / Conduct draw / Delete.
- **Auction draw method** — third draw mode beyond lottery + manual, with per-member bids + tie-break-by-lot per Act 1982 §16.
- **Design tokens** ported to `src/lib/theme.ts` (`Ledger green on paper warmth`).

## Recent Decisions

From `PROJECT.md` Key Decisions (all `— Pending` until validated by a real chit):

- Track only, no money rails
- Foreman commission modeled (≤ 5% per Chit Funds Act 1982)
- Configurable draw type per group — **lottery + manual + auction now all live**
- Phone number is the identity
- Leader fully controls membership
- App Store + Play Store distribution from v1
- Faithful to Chit Funds Act 1982 math — **money-conservation invariant ships ahead of Phase 5**
- Push notifications deferred to v2
- Arrears / penalties / guarantors deferred to v2
- Multi-user data model — replace `users/{uid}/groups/*` with top-level `groups/{groupId}` (still Phase 2)

New decisions from this session:

- **2026-05-22:** UI implementation jumped ahead of phase plans because the design handoff arrived early. Each phase's plan should focus on data/backend work + on-device testing; the UI is largely in place but is rendering against single-user data and will need re-wiring as the multi-user model lands.
- **2026-05-22:** Demo mode shipped as a permanent feature (not a temporary preview hack) — gives non-signed-in stakeholders a way to inspect the product without Firebase setup, and gives App Reviewers a way to evaluate without an Indian SMS-able phone.
- **2026-05-24 (plan 01-04):** Voice-OTP fallback ("Call me instead" button) wired to `auth().signInWithPhoneNumber(e164, true /*forceResend*/)` rather than a separate `verifyPhoneNumber` + `PhoneAuthProvider` flow. Firebase's native escalation policy auto-falls back to voice on the second OTP request for the same number, so the existing `ConfirmationResult` state machine works unchanged. Pitfall 8 mitigated for India SMS deliverability.
- **2026-05-24 (plan 01-04):** Rule-3 deviation — HomeScreen + AddMemberScreen still imported the removed JS-SDK `auth` from `../lib/firebase`. Auto-swapped both to RNFirebase default import; same logical behavior, native runtime.
- **2026-05-24 (plan 01-03):** `isValidIndianMobile` enforces the TRAI 6-9-prefix rule authoritatively over libphonenumber-js `/min` metadata (which is too permissive — accepts leading 5 for carrier sub-routes). Documented as a Rule-1 deviation in 01-03 SUMMARY.
- **2026-05-24 (plan 01-03):** Member.phone is stored as raw E.164 (`+919876543210`); the `+91 98765 43210` display style is reconstructed at render time via `formatNational(e164)`. Pre-Phase-1 records that already hold the space-formatted string stay unchanged — Pitfall D back-compat requires future phone-keyed lookups to normalize on read.
- **2026-05-24 (plan 01-02):** STUBBED execution — user chose to ship code-structure changes (deps + app.config.ts + env config + firebase.ts rewrite) while deferring real `GoogleService-Info.plist` / `google-services.json` to a later session. Stubs are committed with TODO-REPLACE markers so app.config.ts path references resolve; bundle id locked to `com.chitti.app` on both platforms; api-key rotation still owed per below.
- **2026-05-24 (plan 01-02):** Jest moduleNameMapper added (Rule-3 deviation): Firebase JS SDK ESM under jest-expo crashes Node with "Unexpected token 'export'" via @firebase/util's untransformed dist/index.esm.js. Stubbed firebase/app+auth+firestore in tests/__mocks__/firebase-stub.js. Metro/EAS unaffected.

## Workflow Config

From `.planning/config.json`:

- **Mode:** yolo (auto-approve, no per-phase approval gates)
- **Granularity:** standard (5–8 phases → landed on 6)
- **Project mode:** mvp (vertical slicing)
- **Execution:** parallel allowed
- **Git tracking:** yes
- **Model profile:** balanced (sonnet)
- **Workflow agents:** research ✓ · plan_check ✓ · verifier ✓ · nyquist_validation ✓

## Research Artifacts

- `.planning/research/DOMAIN.md` — Chit Funds Act 1982 parameters, money-conservation invariant, gap analysis
- `.planning/research/FEATURES.md` — 16 table-stakes / 12 differentiators / 12 anti-features
- `.planning/research/PITFALLS.md` — 17 pitfalls with phase mappings
- `.planning/codebase/` — brownfield map (ARCHITECTURE, STACK, STRUCTURE, CONCERNS, CONVENTIONS, TESTING, INTEGRATIONS)
- `.planning/design-handoff/` — Claude Design HTML/JSX prototype (10 screens, tokens, README, chat transcript)
- `.planning/UI-BRIEF.md` — the prompt used to generate the design

## Pending Todos

- **(Plan 01-02 follow-up, ahead of 01-05 device verification)** Register iOS app + Android app in Firebase Console for project `chitti-app-edfb1` with bundle/package `com.chitti.app`; download real `GoogleService-Info.plist` + `google-services.json`; overwrite the committed stubs; uncomment the two lines in `.gitignore`; `git rm` the stubs; migrate to EAS file-type secrets (`GOOGLE_SERVICES_JSON`, `GOOGLE_SERVICE_INFO_PLIST`). See `.planning/phases/01-native-phone-auth-env-config/01-02-STUBS.md`.
- **(Plan 01-02 follow-up)** Ensure Phone sign-in method is **Enabled** in Firebase Console → Authentication → Sign-in method.
- Run `/gsd-execute-plan 01-05` to take the first `eas build --profile development` per platform and verify on physical iOS + Android (AUTH-01/02 gates).
- Decide `@react-native-firebase/auth` vs Firebase JS SDK + Cloud Function during Phase 1 planning — **decided in plan 01-02 / 01-04: RNFirebase native**. Record in `.planning/codebase/STACK.md` when 01-04 lands.
- Hardcoded Firebase Web API key is now public on GitHub (was in initial commit too, so net-no-change). Rotate in Phase 6 STORE-04 when provisioning the clean production Firebase project.

## Blockers / Concerns

- **None blocking forward motion.**
- Carry-forward: web-only auth means no on-device test path exists until Phase 1 lands native auth. Demo mode (`Preview without signing in`) is the workaround for stakeholder previews.

## Session Continuity

**Last session:** 2026-05-24 — Executed Phase 1 Plan 01-04 (native auth swap + eas.json). Created eas.json with development/preview/production profiles (dev-client APK + release APK + app-bundle, EXPO_PUBLIC_FIREBASE_* env passthrough). Swapped AuthContext + src/storage/index.ts + LoginScreen + HomeScreen + AddMemberScreen from 'firebase/auth' + '../lib/firebase' to '@react-native-firebase/auth' default import (auth() singleton accessor). LoginScreen now: toE164(phoneDisplay,'IN') -> auth().signInWithPhoneNumber(e164); confirmation.confirm(code) unchanged in shape; mapPhoneAuthError helper added; voice-OTP fallback wired ('Call me instead' -> forceResend=true). Removed RecaptchaVerifier, recaptcha-container View, (window as any).recaptchaVerifier, and '+91${digits}' template literal (Pitfall 6 lint flag cleared). Removed TEMP auth export from src/lib/firebase.ts (file now only owns Firestore JS-SDK init). All 4 test suites GREEN (auth-context.test.ts flipped RED -> GREEN); tsc --noEmit --types jest exits 0; lint on all 6 modified files exits 0.
**Stopped at:** Completed `01-04-native-auth-swap-and-eas-PLAN.md`. Plan 01-05 (device verification — first EAS dev build per platform, physical iOS/Android OTP gates) next. Plans 01-05 + 01-06 still depend on real Firebase Console iOS/Android app registration (still owed; native config files remain TODO-stubs per 01-02-STUBS.md).
**Resume file:** `.planning/phases/01-native-phone-auth-env-config/01-05-device-verification-PLAN.md`

---
*Last updated: 2026-05-24 after plan 01-04 (native auth swap + eas.json)*
