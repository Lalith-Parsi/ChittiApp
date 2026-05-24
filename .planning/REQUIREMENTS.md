# Requirements: ChittiApp

**Defined:** 2026-05-22
**Core Value:** A foreman can run a real, Act-1982-compliant chit end-to-end on phones — every subscriber sees their own ledger from their own device — with no spreadsheet, no WhatsApp message thread, and no math errors.

## v1 Requirements

Requirements for initial launch on Apple App Store + Google Play. Each maps to roadmap phases.
Categories derive from `.planning/research/FEATURES.md`; IDs cross-reference `TS-*` (table-stakes) and `D-*` (differentiator) labels there.

### Authentication

- [ ] **AUTH-01**: Subscriber can sign in with phone number via OTP on a physical iOS device *(TS-1)*
- [ ] **AUTH-02**: Subscriber can sign in with phone number via OTP on a physical Android device *(TS-1)*
- [x] **AUTH-03**: Session persists across app restart (no re-OTP unless signed out) *(code-complete plan 01-04 — RNFirebase native persistence automatic; hardware verification owed to plan 01-05)*
- [x] **AUTH-04**: Subscriber can sign out and return to the OTP screen *(code-complete plan 01-04 — auth().signOut() in HomeScreen + leaveDemoMode; tests/auth-context.test.ts GREEN; hardware verification owed to plan 01-05)*

### Data Model & Backend

- [ ] **DATA-01**: A chit group is a top-level Firestore document accessible to every member from their own account (replaces single-owner `users/{uid}/groups/*` subtree) *(TS-4)*
- [ ] **DATA-02**: Cycles and payments are stored as subcollections under their group (no whole-document writes for cycle / payment mutations) *(TS-6, addresses ARCHITECTURE anti-pattern)*
- [ ] **DATA-03**: Firestore security rules in repo enforce: members read only groups they belong to; only the foreman writes group / cycle / payment data for their own groups *(TS-15)*
- [x] **DATA-04**: Firebase config is supplied via `app.config.ts` + `expo-constants` from environment variables (no hardcoded keys in `src/lib/firebase.ts`) *(TS-16)* — _closed by plan 01-02 (2026-05-24); runtime stubs documented in 01-02-STUBS.md_
- [ ] **DATA-05**: Migration plan / script converts any existing per-user prototype groups into the new top-level structure (one-time, documented)

### Group Setup

- [ ] **GROUP-01**: Foreman can create a chit group with Act-1982 parameters: chit value (C), subscribers (N), duration (T = N enforced), foreman commission percent (f, ≤ 5%), max discount percent (d_max, ≤ 30%), payment due day, draw type *(TS-2)*
- [ ] **GROUP-02**: Foreman can add a member directly by phone number; the member appears immediately with `pending` status until they sign in with that number *(TS-3)*
- [ ] **GROUP-03**: When a phone owner signs in for the first time with a number that has pending memberships, those memberships activate automatically (no manual approval) *(TS-3)*
- [ ] **GROUP-04**: Foreman can remove a non-prized member before the first cycle; cannot remove prized members
- [ ] **GROUP-05**: Subscriber can leave a group they were invited to but never accepted (before first cycle); cannot leave once cycles have started

### Home & Navigation

- [ ] **HOME-01**: "My Chits" home lists every group the signed-in user belongs to, with role badge (foreman / member), next due date, and next draw date *(TS-5)*
- [ ] **HOME-02**: Tapping a chit opens a group detail view; foreman and member see role-appropriate actions

### Cycle Ledger & Payments

- [ ] **CYCLE-01**: Each group has T cycles, each with a `subscription_due` amount per member computed from C / N adjusted by the dividend application policy *(DOMAIN.md §4)*
- [ ] **CYCLE-02**: Foreman can mark a member's subscription for a cycle as `paid` with payment mode label (`cash` / `upi` / `bank` / `cheque` / `other`) and optional note *(TS-7)*
- [ ] **CYCLE-03**: Foreman can unmark a payment within the same cycle (correction); change is recorded in the audit log
- [ ] **CYCLE-04**: Cycle ledger view shows every member's payment status for the current cycle plus running balance per member

### Draws

- [ ] **DRAW-01**: Foreman can conduct a draw of type `lottery` — random selection from non-prized members *(TS-8)*
- [ ] **DRAW-02**: Foreman can conduct a draw of type `manual-entry` — foreman records the winner and the agreed prize amount from an offline draw *(TS-8)*
- [ ] **DRAW-03**: System enforces the **prized-once rule** — already-prized members are excluded from selection / cannot be entered as winner *(TS-11)*
- [ ] **DRAW-04**: System enforces the **discount cap** — entered prize amount ≥ C × (1 − d_max); UI rejects values below the floor *(TS-11)*
- [ ] **DRAW-05**: After a draw is recorded, the cycle is `conducted` and cannot be re-conducted (only corrected via an explicit correction flow)

### Cycle Math

- [ ] **MATH-01**: Dividend per subscriber is computed as `(discount − f × C) / N` with the configured rounding rule *(TS-9, fixes current `(pool − winAmount) / N` bug)*
- [ ] **MATH-02**: Each conducted cycle stores a runtime-asserted **money-conservation invariant**: `N × subscription == prize + foreman_commission + dividend × N`; any cycle that fails the assertion is blocked from being marked conducted *(TS-9)*
- [ ] **MATH-03**: Conducted cycle view displays the money-conservation equation to the user as a visible "trust badge" *(D-4)*
- [ ] **MATH-04**: Foreman commission is computed correctly and shown as a line item every cycle, not folded silently into dividend

### Member View

- [ ] **VIEW-01**: A signed-in member can view their own ledger in any group they belong to: dues, dividends credited, payment history, prized status *(TS-10)*
- [ ] **VIEW-02**: A signed-in member can view the **whole-group** cycle/payment table — same numbers the foreman sees — read-only *(D-2, "member-of-truth ledger")*
- [ ] **VIEW-03**: Per-cycle in-app receipt / statement view that shows pot, prize, commission, dividend, per-member position *(TS-13)*

### Social / Invites / Sharing

- [ ] **SOC-01**: Foreman can invite a member by picking from device contacts (`expo-contacts`) and sending a WhatsApp/SMS deep link (`chitti://join/...`); invitee landing on the link with a matching phone OTP signs in and joins automatically *(D-1)*
- [ ] **SOC-02**: Foreman can share cycle results to WhatsApp / SMS via the native `Share` API with a pre-templated message (winner, dividend, next due) *(D-7)*
- [ ] **SOC-03**: Every group has an append-only audit log capturing membership changes, cycles conducted, payments marked / unmarked, with actor and timestamp; readable by all members *(D-11)*

### Native UX

- [ ] **UX-01**: All confirmation prompts use `Alert.alert` (or equivalent native dialog) — `window.confirm` is removed from the codebase *(TS-12, fixes HomeScreen bug)*
- [ ] **UX-02**: Date selection uses a native date picker on both platforms
- [ ] **UX-03**: Gesture / back navigation behaves correctly on iOS (swipe) and Android (hardware back) for every screen

### Store Submission

- [ ] **STORE-01**: Privacy policy page exists (in-app + public URL) covering phone number, contacts, Firestore data, and DPDP-Act notice *(TS-14)*
- [ ] **STORE-02**: Terms of Service page exists explicitly framing the app as **track-only**, not a payment service, not a registered chit fund, not a financial advisor *(TS-14)*
- [ ] **STORE-03**: App icon, splash screen, screenshots, and store listing copy are production-quality for both stores *(TS-14)*
- [ ] **STORE-04**: Account-deletion endpoint / in-app flow exists (Apple + Google requirement for accounts apps)
- [ ] **STORE-05**: App passes the Google Play "financial services" pre-flight: no in-app payment claims, no investment-return language, clear disclosure of scope

## v2 Requirements

Deferred — known, not in current roadmap.

### Notifications

- **NOTIF-01**: Push notification for payment due (Expo Push / FCM)
- **NOTIF-02**: Push notification for draw day
- **NOTIF-03**: Push notification for cycle conducted (winner + dividend)

### Auctions

- **AUCT-01**: Async auction draw mode — bid window opens, members submit max-discount bids before deadline, lowest at close wins, ties broken by lot *(D-6)*
- **AUCT-02**: Bid history subcollection per cycle, viewable by all members *(D-3)*
- **AUCT-03**: Live auction mode — synchronous bidding via Firestore listeners with a countdown

### Arrears & Defaults

- **ARR-01**: Late payment marker with arrears age in days
- **ARR-02**: Configurable penalty interest rate per group; computed accrual per overdue subscription
- **ARR-03**: Set-off — accrued dividend automatically offsets arrears
- **ARR-04**: Guarantor / security info captured for prized members
- **ARR-05**: Defaulter substitute admission workflow (replace non-prized defaulter)

### Foreman Tooling

- **FORE-01**: Foreman dashboard — collection rate this month, arrears age, who hasn't paid, cycle countdown *(D-9)*
- **FORE-02**: CSV / PDF export of group ledger via `expo-sharing` + `expo-print` *(D-10)*
- **FORE-03**: Configurable dividend application policy (current month vs next month) + rounding rule per group *(D-5)*

### Localization

- **I18N-01**: i18n infrastructure — every user-facing string routed through `t()`, default locale English (this **should land in v1** if practical, even if translations don't)
- **I18N-02**: Translations for Telugu, Tamil, Kannada, Hindi

### Payments-Adjacent

- **PAY-01**: UPI deep links (`upi://pay?pa=...`) launching GPay / PhonePe from the cycle ledger row; foreman still marks paid manually

### Decision Deferred

- **LINK-01**: Decide whether the existing public member deep link (`chitti://member/:token`, `memberTokens/*` collection) survives the multi-user data model rewrite or is removed

## Out of Scope

Explicitly excluded. Documented to prevent scope creep. See FEATURES.md "Anti-Features" for full rationale.

| Feature | Reason |
|---------|--------|
| In-app payment / UPI collect / card / netbanking *(AF-1)* | Turns the app into a payment aggregator — triggers RBI PA-PG licence, escrow, NBFC adjacency. Track-only is the product definition. |
| KYC of subscribers (PAN / Aadhaar / video) *(AF-2)* | Triggers DPDP-Act sensitive PII; we cannot deliver the verification we'd be promising. Foreman vouches. |
| Open marketplace — join chits run by strangers *(AF-3)* | "Prized chit scheme" regulatory category in India (Saradha / Rose Valley). Off the table. |
| Credit scoring / lending against future dividend *(AF-4)* | NBFC. Hard no. |
| Multi-foreman SaaS billing *(AF-5)* | PROJECT.md explicit out-of-scope; pricing unsolved; legal posture changes. |
| Real-time in-group chat *(AF-6)* | Users already have WhatsApp; we'd be a worse WhatsApp. Audit log + share API are the answer. |
| AI auction advisor / bid recommendation *(AF-7)* | Liability magnet; wrong advice on chit money has legal exposure. |
| Web app as a supported surface *(AF-8)* | `react-native-web` continues to build for dev only; not a launch promise. |
| Registrar-of-Chits e-filing *(AF-9)* | Stateful per-state portals; out of scope. |
| Member approval gate for being added by foreman *(AF-10)* | Friction without changing reality; foreman has already onboarded the person in real life. |
| Real-money escrow / "we hold the pot" *(AF-11)* | NBFC + PA. Same as AF-1, harder. |
| Crypto / token / chit-on-chain *(AF-12)* | Zero value, multiplies risk. |
| Web-only Firebase auth APIs (`signInWithPopup`, DOM `RecaptchaVerifier`) | Being removed in AUTH-01/02, not maintained. |

## Traceability

Every v1 requirement is mapped to exactly one roadmap phase. See `.planning/ROADMAP.md` for phase definitions and success criteria.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Code-complete (plan 01-04, 2026-05-24); device verification owed to plan 01-05 |
| AUTH-04 | Phase 1 | Code-complete (plan 01-04, 2026-05-24); device verification owed to plan 01-05 |
| DATA-01 | Phase 2 | Pending |
| DATA-02 | Phase 2 | Pending |
| DATA-03 | Phase 2 | Pending |
| DATA-04 | Phase 1 | Done (plan 01-02, 2026-05-24) |
| DATA-05 | Phase 2 | Pending |
| GROUP-01 | Phase 3 | Pending |
| GROUP-02 | Phase 3 | Pending |
| GROUP-03 | Phase 3 | Pending |
| GROUP-04 | Phase 3 | Pending |
| GROUP-05 | Phase 3 | Pending |
| HOME-01 | Phase 3 | Pending |
| HOME-02 | Phase 3 | Pending |
| CYCLE-01 | Phase 4 | Pending |
| CYCLE-02 | Phase 4 | Pending |
| CYCLE-03 | Phase 4 | Pending |
| CYCLE-04 | Phase 4 | Pending |
| DRAW-01 | Phase 5 | Pending |
| DRAW-02 | Phase 5 | Pending |
| DRAW-03 | Phase 5 | Pending |
| DRAW-04 | Phase 5 | Pending |
| DRAW-05 | Phase 5 | Pending |
| MATH-01 | Phase 5 | Pending |
| MATH-02 | Phase 5 | Pending |
| MATH-03 | Phase 5 | Pending |
| MATH-04 | Phase 5 | Pending |
| VIEW-01 | Phase 4 | Pending |
| VIEW-02 | Phase 4 | Pending |
| VIEW-03 | Phase 5 | Pending |
| SOC-01 | Phase 5 | Pending |
| SOC-02 | Phase 5 | Pending |
| SOC-03 | Phase 2 | Pending |
| UX-01 | Phase 2 | Pending |
| UX-02 | Phase 2 | Pending |
| UX-03 | Phase 2 | Pending |
| STORE-01 | Phase 6 | Pending |
| STORE-02 | Phase 6 | Pending |
| STORE-03 | Phase 6 | Pending |
| STORE-04 | Phase 6 | Pending |
| STORE-05 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 43 total
- Mapped to phases: 43
- Unmapped: 0 ✓

**Per-phase counts:**

| Phase | Reqs |
|-------|------|
| Phase 1 — Native Phone Auth & Env Config | 5 |
| Phase 2 — Multi-User Data Model & Security | 8 |
| Phase 3 — Group Setup & Membership | 7 |
| Phase 4 — Cycle Ledger & Payments | 6 |
| Phase 5 — Draws + Cycle Math (Money-Conservation) | 12 |
| Phase 6 — Store Submission Readiness | 5 |
| **Total** | **43** |

---
*Requirements defined: 2026-05-22*
*Last updated: 2026-05-22 after roadmap creation (traceability populated)*
