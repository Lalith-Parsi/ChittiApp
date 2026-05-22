# ChittiApp

## What This Is

A Splitwise-style mobile app for **chit fund tracking** — a leader (foreman) creates a chit group, invites members by phone number, and the app records monthly subscriptions, draws, and dividends with math faithful to the **Chit Funds Act, 1982**. The app does **not** handle money; payments happen outside (cash / UPI / bank). Distributed via Apple App Store and Google Play.

## Core Value

A foreman can run a real, Act-compliant chit group end-to-end on phone — every subscriber sees their own ledger from their own device — with no spreadsheet, no WhatsApp message thread, and no math errors.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- v1 requirements. Final scope finalized in REQUIREMENTS.md / ROADMAP.md. -->

- [ ] Phone-number identity via OTP that works on iOS, Android, and web (kill the web-only Firebase popup auth)
- [ ] Leader creates a chit group with Act-compliant parameters: chit value (C), subscribers (N), duration (T = N), foreman commission (f, ≤5%), max discount cap (d_max, ≤30%)
- [ ] Leader directly adds members by phone number (no approval gate); when a phone owner signs in, they see the groups they were added to
- [ ] Multi-user data model — members from different accounts share the same group (replace per-user `users/{uid}/groups/*` subtree)
- [ ] Monthly cycle ledger — subscription due, paid/unpaid per member, payment date, leader marks payments
- [ ] Draws — `lottery`, `manual-entry` for v1 launch; `auction-live` and `auction-async` planned within v1 if scope allows
- [ ] Cycle math with foreman commission: `dividend_per_subscriber = (discount − f × C) / N`; **money-conservation invariant** (`N × subscription = winner + foreman_commission + dividend × N`) enforced as a runtime check
- [ ] Discount enforced ≤ d_max; prized member cannot be selected again
- [ ] Member view — each subscriber sees their own dues, dividends, payment history, and current cycle state
- [ ] Native UX — `Alert.alert` not `window.confirm`, native pickers, gesture-correct navigation on iOS and Android
- [ ] Firebase config driven by `app.config.ts` + `expo-constants` (not hardcoded); Firestore security rules in repo and enforced
- [ ] App Store + Play Store submission readiness — icons, splash, privacy policy, terms, store metadata, native auth working on physical devices

### Out of Scope

<!-- Explicit boundaries with reasoning. -->

- **Real payment processing / escrow / wallet** — turning this into a money-mover triggers payment-aggregator, NBFC, and KYC regulation. Tracking is the product.
- **Web as a primary supported surface** — `react-native-web` continues to build for dev convenience, but iOS + Android are the supported platforms. No promises about web for launch.
- **Multi-foreman SaaS / billing** — v1 is single-leader-per-group with no platform-level monetization. SaaS layer is a future-milestone decision.
- **Registrar-of-Chits registration workflow** — Act-compliant *math* is in scope; helping users file with the state Registrar is not.
- **KYC of subscribers** — leader vouches for members. App does not verify identities beyond phone-OTP.
- **Web-only auth APIs** (`signInWithPopup`, `RecaptchaVerifier` against a DOM id) — being removed, not maintained.

### Deferred (v2 / later)

- Push notifications (Expo Push / FCM) for due-date reminders, draw day, results
- Arrears, late-payment penalty rate, set-off against accrued dividend, guarantor info on prized members, defaulter recovery flow
- UPI deep links / QR codes to launch GPay / PhonePe from within the app
- Decision on whether the existing public member deep link (`chitti://member/:token`, `memberTokens` collection) survives the multi-user data model rewrite

## Context

- **Brownfield.** A working Expo / React Native + Firebase prototype already exists. See `.planning/codebase/` for full map. Screens, theming, navigation, and most chit-fund domain types are scaffolded. The data layer assumes a single Firebase user owns all groups (`users/{uid}/groups/*`), which the multi-user model invalidates.
- **Domain reference:** `.planning/research/DOMAIN.md` — Chit Funds Act 1982 parameters, money-conservation invariant, worked example, and gap analysis vs the current schema. Read this before touching cycle math.
- **Known issues from the codebase map** that block real-user launch:
  - Web-only Firebase auth APIs in `src/screens/LoginScreen.tsx` — throws on device
  - `window.confirm` for delete in `src/screens/HomeScreen.tsx` — silently deletes on native
  - Hardcoded Firebase config in `src/lib/firebase.ts` — no per-environment config, no rotation
  - `stripUndefined` JSON round-trip in `src/lib/firestore.ts` — drops Dates, obscures shape, full-tree clone per write
  - Whole-document writes — race conditions and unbounded growth as `members`/`cycles` arrays grow
  - No tests, no logger
- **`AGENTS.md` rule:** Expo is pinned to SDK 56. Read the versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing native or Expo code.

## Constraints

- **Platform:** iOS + Android via Expo SDK 56 (pinned). Web is dev-convenience only.
- **Backend:** Firebase (Auth + Firestore). No custom server. Firestore security rules are the only authorization boundary.
- **Money handling:** None. App records, does not move funds.
- **Regulatory:** Chit-fund math must be faithful to the Chit Funds Act, 1982 (foreman commission cap, discount cap, prized-once rule, money conservation). App is **not** a registered chit business and does not pretend to be.
- **Identity:** Phone number via Firebase Phone Auth OTP. Must work on physical iOS and Android, not just web.
- **Distribution:** Apple App Store + Google Play Store. App must satisfy each store's submission requirements (privacy policy, content rating, native auth, etc.).
- **Tech-debt to clear before launch:** env-based config, native auth, native confirm dialogs, Firestore security rules, basic test coverage.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Track only, no money rails | Avoids payment-aggregator / NBFC / KYC regulation entirely. Splitwise model proves users tolerate "pay outside, log inside." | — Pending |
| Foreman commission modeled (≤5%) | Leader is acting as a regulated foreman; commission is a real economic mechanism we must compute, not skip. | — Pending |
| Configurable draw type per group (lottery / live auction / async auction / manual) | Different real-world chits run differently; one mode would force users out of the app. v1 ships at least lottery + manual; auction modes follow. | — Pending |
| Phone number is the identity | Splitwise-style invite flow; matches user mental model from WhatsApp; aligns with Indian mobile-first context. | — Pending |
| Leader fully controls membership (no approval step) | Foreman has legal responsibility for who is in their chit; an approval gate adds friction without changing reality. | — Pending |
| App Store + Play Store distribution from v1 | Web-only auth path is a dead-end for a real product; native is the bar regardless. | — Pending |
| Faithful to Chit Funds Act 1982 math | If the dividend math is wrong, every party loses trust in the ledger. Correctness here is the product. | — Pending |
| Push notifications deferred to v2 | Critical eventually, but not the hill v1 dies on. SMS / WhatsApp out-of-band fills the gap for the first real chit. | — Pending |
| Arrears / penalties / guarantors deferred to v2 | Real-world feedback from first chit will shape the model better than spec-from-the-Act will. | — Pending |
| Replace `users/{uid}/groups/*` with multi-user data model | Multi-account groups are the entire premise of the app. The current per-user subtree cannot represent them. Migration is unavoidable. | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-22 after initialization*
