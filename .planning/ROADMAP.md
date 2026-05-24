# ROADMAP — ChittiApp

**Created:** 2026-05-22
**Mode:** mvp (vertical slicing — every phase ships an end-to-end user-visible capability)
**Granularity:** standard (6 phases)
**Coverage:** 43 / 43 v1 requirements mapped

## North Star

A foreman can run a real Act-1982-compliant chit end-to-end on phones — every subscriber sees their own ledger from their own device — with no spreadsheet, no WhatsApp thread, no math errors.

Every phase below must move the product visibly closer to a real foreman running a real beta chit; no phase is allowed to be invisible infrastructure with no user-facing slice.

## Phases

- [ ] **Phase 1: Native Phone Auth & Env Config** — A real user signs into the app on a physical iOS or Android device via OTP and stays signed in.
- [ ] **Phase 2: Multi-User Data Model & Security** — Two different accounts can see the same group; Firestore enforces who reads/writes what; every change is audit-logged.
- [ ] **Phase 3: Group Setup & Membership** — Foreman creates an Act-compliant chit group, adds members by phone, and members see those groups on their own Home.
- [ ] **Phase 4: Cycle Ledger & Payments** — Foreman tracks subscription payments per cycle; every member sees the same ledger from their own device.
- [ ] **Phase 5: Draws + Cycle Math (Money-Conservation)** — Foreman conducts lottery and manual draws with correct foreman commission, dividend, and money-conservation invariant; results share to WhatsApp.
- [ ] **Phase 6: Store Submission Readiness** — App passes Apple + Google Play submission with privacy policy, account deletion, and finance-services framing.

## Phase Details

### Phase 1: Native Phone Auth & Env Config
**Goal:** A real user signs into the app on a physical iOS or Android device via OTP, with the session surviving cold starts.
**Mode:** mvp
**Depends on:** Nothing (entry phase)
**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, DATA-04
**Success Criteria** (what must be TRUE):
  1. A user enters their phone number on a physical iPhone, receives an OTP via SMS, enters it, and lands on Home (`AUTH-01`).
  2. A user does the same on a physical Android device (Pixel / Samsung) on an Indian Jio or Airtel SIM (`AUTH-02`).
  3. Closing and reopening the app does not require re-OTP — session persists via `AsyncStorage` (`AUTH-03`).
  4. A user can sign out from Settings and is returned to the OTP screen (`AUTH-04`).
  5. Firebase project (API key, project ID, sender ID) is read from `app.config.ts` + `expo-constants`; no hardcoded keys in `src/lib/firebase.ts`; dev and prod projects swap by env var (`DATA-04`).
**Plans:** 6 plans
  - [x] 01-01-test-infra-PLAN.md — Wave 0: Jest + ESLint + Pitfall-6 lint rule + red test scaffolds *(completed 2026-05-24, see 01-01-test-infra-SUMMARY.md)*
  - [x] 01-02-config-and-deps-PLAN.md — Wave 1: install RNFirebase/dev-client/build-properties/libphonenumber; app.config.ts + env-driven firebase.ts (DATA-04) *(completed 2026-05-24 STUBBED — see 01-02-config-and-deps-SUMMARY.md + 01-02-STUBS.md; real on-device OTP pending Firebase Console app registration)*
  - [x] 01-03-helpers-phone-money-PLAN.md — Wave 2: src/utils/phone.ts (toE164) + src/utils/money.ts (Paisa); normalize AddMember saves *(completed 2026-05-24, see 01-03-helpers-phone-money-SUMMARY.md)*
  - [x] 01-04-native-auth-swap-and-eas-PLAN.md — Wave 3: swap AuthContext + LoginScreen to @react-native-firebase/auth; eas.json with 3 profiles (AUTH-03/04 code) *(completed 2026-05-24, see 01-04-native-auth-swap-and-eas-SUMMARY.md)*
  - [ ] 01-05-device-verification-PLAN.md — Wave 4: first EAS dev build + physical iOS/Android verification matrix (AUTH-01/02)
  - [ ] 01-06-hardening-and-rotation-PLAN.md — Wave 5: preview+production EAS builds; rotate leaked API key; STACK.md update

**UI hint**: yes

**Phase-level pitfall guardrails** (from PITFALLS.md, enforced by must-haves in plan):
- Decide explicitly: `@react-native-firebase/auth` + EAS Build vs Firebase JS SDK + custom-token via Cloud Function + DLT SMS. Document in `STACK.md`. (Pitfall 7)
- `toE164()` phone normalizer (`libphonenumber-js`) is the only writer of phone strings; lint-rule forbids raw `+91` concatenation. (Pitfall 6)
- Money primitive (`Paisa`) lib (`src/utils/money.ts`) lands here, ahead of any cycle math, to avoid a later unit migration. (Pitfall 1)
- "Didn't receive? Call me" voice-OTP fallback wired in UI from day 1. (Pitfall 8)

### Phase 2: Multi-User Data Model & Security
**Goal:** A leader on account A creates a group; a separate account B (signed in with a phone number the leader added) sees that same group from their own device — and Firestore rules prevent strangers from reading it.
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** DATA-01, DATA-02, DATA-03, DATA-05, SOC-03, UX-01, UX-02, UX-03
**Success Criteria** (what must be TRUE):
  1. A chit group lives at top-level `groups/{groupId}` with `memberPhones[]` + `memberUids[]`; account A as leader and account B as added member both load the same `groupId` from their own Home (`DATA-01`).
  2. Cycles, payments, bids, and audit-log entries are stored as subcollections under the group; no whole-document writes for cycle / payment mutations; load-test of 50 members × 50 cycles keeps the parent doc under 200 KB (`DATA-02`).
  3. `firestore.rules` is in repo, enforced via `@firebase/rules-unit-testing` in CI: members read only groups they belong to (uid or phone-claim match); only the foreman writes group / cycle / payment data; `auditLog/**` is append-only and cannot be edited or deleted, not even by the foreman (`DATA-03`, `SOC-03`).
  4. A one-shot, dry-run-capable migration script converts any existing `users/{uid}/groups/*` prototype groups into the new top-level structure; un-normalizable phones are logged; idempotent re-runs are safe (`DATA-05`).
  5. Every membership / cycle / payment / settings write goes through a helper that appends an `auditLog` entry with actor, role, before, after, and timestamp; member view shows a per-payment "marked by … at …" pill (`SOC-03`).
  6. Every destructive action uses `Alert.alert` (no `window.confirm` anywhere in `src/`); date inputs use a native picker on both platforms; iOS swipe-back and Android hardware-back behave correctly on every reachable screen (`UX-01`, `UX-02`, `UX-03`).
**Plans**: TBD
**UI hint**: yes

**Phase-level pitfall guardrails:**
- `phoneIndex/{e164}` collection is the only place phone→uid mapping lives; written on first sign-in. (Pitfall 5)
- Member-side group query is `where('memberPhones', 'array-contains', myPhone)` with composite index in `firestore.indexes.json`. (Pitfalls 5, 6)
- All multi-doc updates use `runTransaction` / `writeBatch`; `payments/{memberId}` carries a `version` field enforced by rules. (Pitfall 11)
- Rules whitelist enum values and reject `discount > maxDiscountPct × C` at write time, not just in UI. (Pitfall 17)

### Phase 3: Group Setup & Membership
**Goal:** A foreman creates an Act-1982-compliant chit group, adds members by phone number, and those members — once signed in with that phone — see the group on their own Home with the correct role badge and next-due / next-draw date.
**Mode:** mvp
**Depends on:** Phase 2
**Requirements:** GROUP-01, GROUP-02, GROUP-03, GROUP-04, GROUP-05, HOME-01, HOME-02
**Success Criteria** (what must be TRUE):
  1. A foreman creates a group entering chit value (C), subscribers (N), foreman commission % (≤ 5), max discount % (≤ 30), payment due day, and draw type; T = N is enforced; out-of-range values are rejected at the form and at the security-rule layer (`GROUP-01`).
  2. The foreman adds a member by phone number; the member appears immediately as `pending`; the parsed E.164 form is shown back in the confirmation so the foreman can verify (`GROUP-02`).
  3. When a person signs in with a phone number that has pending memberships, those memberships activate automatically — they see the group on their own Home with no further action required (`GROUP-03`).
  4. A foreman can remove a non-prized member before the first cycle; the UI disables removal for prized members and the security rule blocks it server-side (`GROUP-04`).
  5. An invited member can leave a group they never accepted (before cycle 1 starts); they cannot leave after the first cycle is conducted (`GROUP-05`).
  6. "My Chits" Home lists every group the signed-in user belongs to with a `foreman` / `member` role badge, next due date, and next draw date — same data, role-appropriate framing (`HOME-01`).
  7. Tapping a group opens a detail view; foreman sees "Add member" / "Conduct draw" / "Mark payment" actions, member sees read-only ledger + "View" actions (`HOME-02`).
**Plans**: TBD
**UI hint**: yes

### Phase 4: Cycle Ledger & Payments
**Goal:** A foreman marks subscription payments cycle-by-cycle in a payment-mode aware ledger; every member sees the same whole-group ledger from their own device, plus their personal row at the top.
**Mode:** mvp
**Depends on:** Phase 3
**Requirements:** CYCLE-01, CYCLE-02, CYCLE-03, CYCLE-04, VIEW-01, VIEW-02
**Success Criteria** (what must be TRUE):
  1. The group has exactly T cycles, each carrying a per-member `subscription_due` computed from C / N adjusted by the dividend-application policy; first cycle has no prior dividend; rendering is identical on the foreman's and the member's device (`CYCLE-01`).
  2. The foreman marks a member's subscription as paid with a payment-mode label (`cash` / `upi` / `bank` / `cheque` / `other`) and an optional note; the change is reflected on both leader and member devices via `onSnapshot` within 2 s (`CYCLE-02`).
  3. The foreman can unmark a payment within the same cycle (correction); the audit log records both the mark and the unmark with actor + timestamp (`CYCLE-03`).
  4. The cycle ledger view shows every member's payment status for the current cycle and a running balance per member; sorted with unpaid members first (`CYCLE-04`).
  5. A member opens any group they belong to and sees their own dues, dividends credited, payment history, and prized-or-not status — without ever seeing data from another foreman's groups (`VIEW-01`).
  6. A member can switch from "My ledger" to "Whole group" and sees the same cycle/payment table as the foreman, read-only — the "member-of-truth" promise (`VIEW-02`).
**Plans**: TBD
**UI hint**: yes

### Phase 5: Draws + Cycle Math (Money-Conservation)
**Goal:** A foreman conducts a full cycle — lottery or manual-entry draw — and the app produces the correct prize, foreman commission, and dividend with a visible, runtime-asserted money-conservation invariant; results share to WhatsApp in one tap.
**Mode:** mvp
**Depends on:** Phase 4
**Requirements:** DRAW-01, DRAW-02, DRAW-03, DRAW-04, DRAW-05, MATH-01, MATH-02, MATH-03, MATH-04, VIEW-03, SOC-01, SOC-02
**Success Criteria** (what must be TRUE):
  1. The foreman conducts a `lottery` draw and the system randomly selects from non-prized members only; the selection is recorded in the cycle subcollection and the audit log (`DRAW-01`, `DRAW-03`).
  2. The foreman conducts a `manual-entry` draw, entering the winner and the agreed prize amount from an offline event; the system rejects already-prized members and rejects prize amounts below `C × (1 − d_max)` both in the UI and at the security-rule layer (`DRAW-02`, `DRAW-03`, `DRAW-04`).
  3. Once a draw is recorded, the cycle is marked `conducted` and cannot be re-conducted without an explicit correction flow that writes a fresh audit-log entry (`DRAW-05`).
  4. For every conducted cycle, the app computes `dividend_per_subscriber = (discount − f × C) / N` in integer paisa with the configured rounding rule; the foreman commission appears as its own line item, never folded into dividend (`MATH-01`, `MATH-04`).
  5. Every conducted cycle stores and re-asserts the **money-conservation invariant** `N × subscription == prize + (f × C) + (dividend × N) + rounding_residue`; any cycle that fails the assertion is blocked from being marked conducted; a property test fuzzes 10,000 random `(C, N, f, discount, drawType)` tuples and passes (`MATH-02`).
  6. The conducted cycle view displays the money-conservation equation to the user as a visible "trust badge" — e.g. "₹1,00,000 = ₹70,000 winner + ₹5,000 commission + ₹1,250 × 20 dividend ✓" (`MATH-03`).
  7. Every conducted cycle has an in-app receipt view showing pot, prize, commission, dividend, and each member's position for that cycle (`VIEW-03`).
  8. The foreman can pick a contact via `expo-contacts` and send a `chitti://join/...` deep link over WhatsApp / SMS; on landing + OTP sign-in the invitee joins the group automatically (`SOC-01`).
  9. From the conducted-cycle view the foreman taps "Share" and a pre-templated WhatsApp/SMS message ("Cycle 5 conducted. Winner: Ravi. Dividend ₹1,250. Your next due ₹3,750.") opens via the native `Share` API (`SOC-02`).
**Plans**: TBD
**UI hint**: yes

**Phase-level pitfall guardrails:**
- Single `effectiveSubscription(group, cycleIndex, memberId)` function — every screen calls this; eliminates leader-vs-member math drift. (Pitfall 3)
- `cycle.drawType` includes `'lottery'`, `'manual'`, plus `'foreman-prize'` reserved for cycle 1 if `foremanTakesFirstCycle: true`. Lottery cycles compute `prize = C − f × C`. (Pitfall 16)
- Prized-once enforced in a `runTransaction` AND in `firestore.rules` via `getAfter()`. (Pitfall 2)
- All money is integer paisa throughout cycle math; no `parseFloat` / `toFixed` outside `money.ts`. (Pitfall 1)

### Phase 6: Store Submission Readiness
**Goal:** The app is accepted by both Apple App Store and Google Play, with the legal, privacy, and policy posture appropriate for a finance-adjacent track-only product operating under the Chit Funds Act, 1982.
**Mode:** mvp
**Depends on:** Phase 5
**Requirements:** STORE-01, STORE-02, STORE-03, STORE-04, STORE-05
**Success Criteria** (what must be TRUE):
  1. A privacy policy page exists in-app (Settings → Privacy) and at a public URL, covering phone number collection, contacts usage, Firestore data storage, and DPDP-Act notice; both store listings link to it (`STORE-01`).
  2. A Terms of Service page exists in-app and publicly, explicitly framing the app as **track-only** — not a payment service, not a registered chit fund, not a financial advisor — wording reviewed against Google Play Personal Loans (India) policy and Apple guideline 1.4.1 (`STORE-02`).
  3. Production-quality app icon, splash screen, 4+ screenshots per platform, and store listing copy ship for both stores; copy contains zero "invest" / "earn" / "loan" / "credit" / "guaranteed return" language (`STORE-03`).
  4. An in-app "Delete Account" flow exists in Settings: confirms, signs out, deletes the user from Firebase Auth, removes the user's uid from every `memberUids[]` they appear in, anonymizes their member rows (`name = "Former Member"`, phone nulled) so cycle ledgers and money-conservation remain intact, deletes their `phoneIndex/{phone}` doc, and writes an audit-log entry — satisfies Apple 5.1.1(v) and DPDP retention reconciliation (`STORE-04`).
  5. The Google Play Financial Features Declaration is filed selecting "does not facilitate financial services" with an explanatory note; demo Firebase test phone numbers + fixed OTPs are configured in dev project only and provided in Apple App Review notes; submission notes include the standard "ChittiApp is a record-keeping tool…" framing paragraph (`STORE-05`).
**Plans**: TBD
**UI hint**: yes

**Phase-level pitfall guardrails:**
- Delete-account anonymizes; does not cascade-delete ledger entries that belong to the group as a whole. (Pitfall 14)
- App Privacy nutrition labels declared accurately: phone number, user ID, contacts (if used). (Pitfall 13)
- Listing copy reviewed for finance-keyword triggers before binary upload. (Pitfall 12)

## Phase Dependencies

```
Phase 1 (Native Auth + Env)
   └─> Phase 2 (Multi-User Data Model + Rules + Audit Log)
          └─> Phase 3 (Group Setup + Home)
                 └─> Phase 4 (Cycle Ledger + Payments)
                        └─> Phase 5 (Draws + Money Math + Share)
                               └─> Phase 6 (Store Submission Readiness)
```

Strictly linear by design — every later slice depends on the data model and auth path laid down before it. There is no useful parallelization across these phases for a one-person + Claude workflow.

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Native Phone Auth & Env Config | 0/6 | Planned | — |
| 2. Multi-User Data Model & Security | 0/0 | Not started | — |
| 3. Group Setup & Membership | 0/0 | Not started | — |
| 4. Cycle Ledger & Payments | 0/0 | Not started | — |
| 5. Draws + Cycle Math (Money-Conservation) | 0/0 | Not started | — |
| 6. Store Submission Readiness | 0/0 | Not started | — |

Plan counts populate when `/gsd-plan-phase N` runs for each phase.

## Coverage

All 43 v1 requirements mapped to exactly one phase (see REQUIREMENTS.md Traceability).

| Phase | Reqs | IDs |
|-------|------|-----|
| 1 | 5 | AUTH-01, AUTH-02, AUTH-03, AUTH-04, DATA-04 |
| 2 | 8 | DATA-01, DATA-02, DATA-03, DATA-05, SOC-03, UX-01, UX-02, UX-03 |
| 3 | 7 | GROUP-01, GROUP-02, GROUP-03, GROUP-04, GROUP-05, HOME-01, HOME-02 |
| 4 | 6 | CYCLE-01, CYCLE-02, CYCLE-03, CYCLE-04, VIEW-01, VIEW-02 |
| 5 | 12 | DRAW-01, DRAW-02, DRAW-03, DRAW-04, DRAW-05, MATH-01, MATH-02, MATH-03, MATH-04, VIEW-03, SOC-01, SOC-02 |
| 6 | 5 | STORE-01, STORE-02, STORE-03, STORE-04, STORE-05 |
| **Total** | **43** | — |

---
*Roadmap created: 2026-05-22 by gsd-roadmapper*
