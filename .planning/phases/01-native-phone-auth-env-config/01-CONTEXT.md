# Phase 1: Native Phone Auth & Env Config — Context

**Gathered:** 2026-05-23
**Status:** Ready for research + planning
**Source:** Inline discussion during `/gsd-plan-phase 1`

<domain>
## Phase Boundary

A signed-in user reaches Home on a **physical iOS or Android device** by entering an Indian +91 mobile number, receiving a real SMS-delivered OTP, and verifying it. Session persists across cold app starts. Firebase configuration is supplied via environment variables — no hardcoded keys remain in `src/lib/firebase.ts`.

This phase does **not** touch the multi-user data model (Phase 2), group features (Phase 3+), or store submission (Phase 6). It is **purely the auth + env scaffolding** that lets every later phase be tested on real devices.

**What's already shipped (from the prior session):**
- LoginScreen UI (phone entry + 6-box OTP grid + countdown + resend / call-me-instead)
- `tnum` formatting helper, brass-accent demo affordance
- Toast feedback wired into auth events
- Demo mode (preserves preview path even when real auth is being rebuilt)

**What this phase delivers:**
- Native phone-auth backend wired behind the existing UI
- Firebase config moved out of source
- Two helpers (`toE164`, `Paisa`) that keep future phases honest
- A verified build path (EAS) that downstream phases reuse

</domain>

<decisions>
## Implementation Decisions

### Native auth library — `@react-native-firebase/auth` + EAS Build [LOCKED]

- Install `@react-native-firebase/app` + `@react-native-firebase/auth`.
- Use native `auth().signInWithPhoneNumber()` / `confirmation.confirm()` — no JS-SDK `RecaptchaVerifier`.
- Remove the `recaptcha-container` `<View nativeID>` hack in `LoginScreen.tsx` and the `(window as any).recaptchaVerifier` write in `sendOTP()`.
- Keep the existing UI components and state machine — only the API calls inside `sendOTP()` and `verifyOTP()` change.
- Expo Go is **dropped** as a supported runtime. EAS Build is the only path from here on.
- Reason: native module bypasses recaptcha, works on real device, no SMS volume cap surprises beyond Firebase's free tier, easiest migration from current code.

### EAS Build setup — in this phase [LOCKED]

- Add `eas.json` with three profiles: `development` (dev client, internal distribution), `preview` (release build, internal distribution), `production` (store-ready).
- Use Expo's Dev Client so Metro fast-refresh still works during native development.
- Wire EAS credentials for Google service account (Android) and Apple key (iOS).
- One successful build of each profile on EAS servers is part of the phase's verification.
- Add `expo-dev-client` dep to `package.json`.

### DLT-SMS provider integration — DECIDE DURING RESEARCH

- For Phase 1, the **default position** is to use Firebase Phone Auth's built-in SMS delivery. This works in India today without DLT registration (Firebase delivers via partners; not all routes are DLT-compliant but for a launch beta this is acceptable).
- The researcher must investigate:
  - Current DLT enforcement landscape (TRAI regulations as of 2026).
  - Whether Firebase's default SMS path is sufficient for App Store / Play Store submission to an Indian audience.
  - Cost / setup tradeoff of MSG91 vs Karix vs Twilio Verify if we have to integrate a DLT-registered provider in Phase 1.
- The researcher writes one of:
  - **(a)** "Firebase default is fine for v1 — DLT becomes v1.x. Here's the rationale + when to revisit." → phase scope unchanged.
  - **(b)** "DLT must land in Phase 1. Recommended provider: X. Here's the integration shape." → planner extends Phase 1 scope.

### Verification target — both iOS + Android required [LOCKED]

Phase 1 is NOT complete until:
- A user signs in via OTP on a **physical iPhone** running iOS 17+ on an Indian Jio or Airtel SIM, lands on Home, force-quits the app, reopens it, and finds they are still signed in.
- The same flow succeeds on a **physical Android device** (Pixel or Samsung) running Android 13+, also on an Indian SIM.
- Sign-out from the settings sheet returns to the phone-entry screen on both.

No simulator-only or web-only verification counts.

### Money primitive (`Paisa`) — minimal helper, no migration [LOCKED]

- Add `src/utils/money.ts` with:
  - `type Paisa = number & { readonly __brand: 'Paisa' }` (branded integer).
  - `paisa(rupees: number): Paisa` — convert rupees to paisa.
  - `toRupees(p: Paisa): number` — convert back.
  - `formatINR(p: Paisa, opts?: { withSymbol?: boolean }): string` — Indian-system formatting, reuses the existing `fmtINR` helper from `theme.ts`.
  - `addPaisa(a: Paisa, b: Paisa): Paisa`, `subPaisa(a: Paisa, b: Paisa): Paisa`, `mulPaisa(a: Paisa, n: number): Paisa`.
- **Do NOT refactor existing code.** Existing `ChittiGroup.amount`, `Cycle.winAmount`, etc. stay as plain `number` (integer rupees) — current math is correct.
- New code added in Phase 1 onward should reach for `Paisa` when modeling new money fields.
- A short ADR-style note at the top of `money.ts` explains the rationale and the rules: "use Paisa for any field added from now on; do not migrate existing fields without a planned refactor."

### Phone normalizer (`toE164`) — full helper + lint rule [LOCKED]

- Add `libphonenumber-js` dep (use the small `min` build).
- Add `src/utils/phone.ts` with:
  - `toE164(input: string, defaultCountry?: CountryCode): string | null` — null on invalid.
  - `isValidIndianMobile(input: string): boolean` — keeps the current regex check around for fast-path UI validation.
  - `formatNational(e164: string): string` — render `+91 98765 43210` style for display.
- Update `LoginScreen.tsx` to call `toE164` before invoking `auth().signInWithPhoneNumber()`.
- Update `AddMemberScreen.tsx` to normalize the entered number to E.164 before saving on the member record (`Member.phone` becomes E.164 going forward; older records stay as-is).
- Add an ESLint rule (or codified `// eslint-disable-no-restricted-syntax` config) that forbids `'+91' + ` string concatenation and direct `phoneNumber` writes. Per Pitfall 6.

### Claude's Discretion

- `eas.json` schema and concrete profile contents (versions, channels, distribution names).
- `firebase.config.ts` shape — how `app.config.ts` reads from env vars vs `.env*` files. (Researcher will probably standardize on `expo-constants` + `EXPO_PUBLIC_*` env names.)
- Whether to add a `.env.example` committed to the repo with placeholder keys.
- Logging strategy for auth errors (silent + toast vs sentry-like reporter; probably silent + toast for Phase 1).
- Whether Sign-out should clear demo data too (probably yes for symmetry).
- Exact toast copy on auth success / failure.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Domain + product scope
- `.planning/PROJECT.md` — scope contract, key decisions, out-of-scope items
- `.planning/REQUIREMENTS.md` — REQ-ID definitions (AUTH-01..04, DATA-04)
- `.planning/ROADMAP.md` — Phase 1 row + success criteria

### What already exists (don't re-implement)
- `.planning/STATE.md` — explicit list of what's shipped from the prior session; the UI is already built
- `src/screens/LoginScreen.tsx` — the existing UI that this phase's backend work plugs into
- `src/lib/AuthContext.tsx` — the user/loading/demo state machine; native auth must integrate with `onAuthStateChanged`
- `src/lib/firebase.ts` — the hardcoded config that DATA-04 must replace
- `src/storage/index.ts` — uses `auth.currentUser` directly; native auth must keep this contract

### Hard constraints
- `AGENTS.md` — Expo SDK 56 pinned; read Expo v56 docs before touching native code
- `.planning/research/DOMAIN.md` — chit fund math (irrelevant to Phase 1 but part of the canonical set)
- `.planning/research/PITFALLS.md` — Pitfalls 1 (Paisa), 6 (toE164), 7 (RNFirebase vs JS SDK), 8 ("Didn't receive OTP?" UX)

### Codebase map
- `.planning/codebase/STACK.md` — current dep list and what's pinned
- `.planning/codebase/ARCHITECTURE.md` — auth/data flow; the "Auth Flow" section is what we're rebuilding
- `.planning/codebase/CONCERNS.md` — flags the hardcoded firebase config and web-only auth

### Design (no UI work owed)
- `.planning/design-handoff/project/screens/01-phone-entry.jsx` — visual reference for phone entry (already implemented in RN)
- `.planning/design-handoff/project/screens/02-otp.jsx` — visual reference for OTP screen (already implemented in RN)

</canonical_refs>

<specifics>
## Specific Ideas

- Phase 1 should feel small and surgical. The UI is in place. The backend swap-out is the work.
- The biggest unknown is the DLT-SMS provider question — the researcher's recommendation drives whether Phase 1 grows or stays focused.
- Once Phase 1 ships, every later phase becomes dramatically easier to validate because we have real device testing for the first time.
- Demo mode must continue to work after the swap — entering demo mode still skips real auth, and exiting demo correctly returns to the (now native) OTP screen.
- The `Paisa` and `toE164` helpers are infrastructure paving for Phases 3–5. Adding them in Phase 1 means later phases write the right primitives from day one.

</specifics>

<deferred>
## Deferred Ideas

- **Full Paisa migration** — refactoring `ChittiGroup.amount` etc. to `Paisa` is deferred. New fields use Paisa; existing stay as integer rupees.
- **Sentry / Crashlytics wiring** — auth errors are surfaced via toast only. Telemetry is a v1.x add.
- **Account-deletion endpoint** — Apple + Play Store require this but it's in Phase 6 (STORE-04), not here.
- **Phone-number-change flow** — out of scope; user signs out and signs in with a new number.
- **OAuth fallback (Google)** — explicitly removed in this session; PROJECT.md key decision.
- **Web-app native auth** — web stays demo-mode + dev-only per PROJECT.md.

</deferred>

---

*Phase: 01-native-phone-auth-env-config*
*Context gathered: 2026-05-23 via inline discussion during `/gsd-plan-phase 1`*
