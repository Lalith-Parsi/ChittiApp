# Feature Research

**Domain:** Consumer mobile chit-fund tracking (India-focused, Splitwise-style social, track-only no money-rails)
**Researched:** 2026-05-22
**Confidence:** HIGH — six Indian operator apps surveyed plus three global ROSCA apps (MoneyFellows, Roscas.io, MyChama) and the Splitwise reference. India-specific behaviours (UPI, phone-OTP, regional language) cross-verified across Margadarsi, Shriram, Kapil, Muthoot. Domain math is canonical from `.planning/research/DOMAIN.md`.

---

## Context Recap (do not re-research)

- **Product framing.** Splitwise-for-chits. Track only. No money moves. Foreman runs an Act-1982-compliant chit; every subscriber sees their own ledger from their own device. PROJECT.md is the scope contract.
- **Constraints that bound the feature set.**
  - No money rails → no payment gateway, no escrow, no settlement. Anything that would require an NBFC / PA-PG / KYC posture is OUT.
  - Phone-OTP identity → contacts-based invites are natural; email is a second-class citizen.
  - iOS + Android only; Expo SDK 56 pinned; Firestore-only backend, no custom server.
  - Brownfield app already has `ChittiGroup` / `Cycle` / `Member` / `Payment` / `DrawType` types and basic CRUD; gap analysis is in `DOMAIN.md §7`.
- **What every Indian operator app (Margadarsi, Shriram, Kapil, Muthoot, Balussery) treats as table-stakes for a *subscriber-side* app:** OTP login, "My Chits" list, per-cycle dividend statement, auction view, payment history / receipts, branch / contact info. Indian operator apps assume the operator is the foreman and the subscriber is read-mostly. ChittiApp inverts this — the **foreman is also a user of the same app**. That inversion drives the differentiator set below.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Missing any of these = the first chit dies in WhatsApp.

| # | Feature | Why Expected | Complexity | Notes |
|---|---------|--------------|------------|-------|
| TS-1 | **Phone-OTP login** working on physical iOS + Android | Every Indian fintech / social app does this; current `signInWithPopup` is web-only and throws on device (`src/screens/LoginScreen.tsx:25`) | M | Replace `RecaptchaVerifier`-against-DOM-id path. Native phone auth on Expo SDK 56 is the gate for everything else. |
| TS-2 | **Create chit group with Act-1982 parameters** (C, N, T=N, f≤5%, d_max≤30%, payment day) | These are the legal shape of a chit; without them the math is wrong | S | Schema mostly exists in `ChittiGroup`; add `foremanCommissionPct`, `maxDiscountPct`, decide canonical `chitValue` vs derived `subscription` (DOMAIN.md §7) |
| TS-3 | **Add member by phone number** (no approval gate, leader-direct) | Splitwise pattern; foreman has legal responsibility for membership | S | Per PROJECT.md key decision. Resolve later when the phone owner signs in. |
| TS-4 | **Multi-user group data model** — group visible to every member from their own account | The entire premise. Current `users/{uid}/groups/*` cannot represent this | L | Top-level `groups/{groupId}` + `memberships/{userId}/{groupId}` index. Drives Firestore rules redesign. Hard dependency for everything member-side. |
| TS-5 | **"My Chits" home — list of groups I'm in, role badge (foreman / member), next due date, next draw date** | Direct port of Margadarsi / Kapil / Shriram subscriber home; users open the app to answer "what do I owe and when" | S | Extends current `HomeScreen`. |
| TS-6 | **Monthly cycle ledger — who paid, when, balance due** | Every operator app shows this; the foreman uses it daily, the subscriber checks it monthly | M | Already partly modelled (`Payment`, `Cycle`). Needs subcollection refactor — whole-doc writes won't scale (current anti-pattern in `firestore.ts:25`). |
| TS-7 | **Foreman marks payment received** (cash / UPI / bank — payment-mode label only, no integration) | Track-only model lives or dies here; this is the one foreman action per member per month | S | Add `paymentMode: 'cash' \| 'upi' \| 'bank' \| 'cheque' \| 'other'` enum + free-text note. |
| TS-8 | **Conduct draw — lottery + manual-entry** for v1 launch | PROJECT.md active scope; lottery is the minimum non-auction draw | S/M | `DrawScreen` scaffold exists. Add non-prized eligibility enforcement (DOMAIN.md §7 ✗). |
| TS-9 | **Cycle math with foreman commission** + money-conservation invariant runtime check | Wrong dividend = product trust dies forever | S | `calculateDividend` currently computes `(pool − winAmount)/N`. Must become `(discount − f×C)/N`. Add `assertMoneyConservation(cycle, group)`. |
| TS-10 | **Member ledger view** — my dues, my dividends credited, my payment history, my prized status | Every Indian operator app has this exact view (Shriram, Kapil); subscribers expect it | M | Member-scoped read of group cycles + payments. |
| TS-11 | **Discount cap enforcement (d_max) + prized-once rule** | Both are statutory; allowing a violation is a bug, not a feature | S | Validators in `src/utils/chitti.ts`. |
| TS-12 | **Native confirm dialogs, native pickers, gesture-correct nav** | `window.confirm` silently deletes on native (current bug, `HomeScreen.tsx:27`); Indian users notice janky UX immediately | S | `Alert.alert`, `@react-native-community/datetimepicker`, native stack already configured. |
| TS-13 | **Per-cycle receipt / statement** (in-app view; share-as-image or PDF is bonus) | Every operator app provides receipts; Indian users archive them for tax / dispute | M | View-only HTML/RN render in v1; PDF export is v1.x. |
| TS-14 | **Privacy policy + Terms + store metadata** | Apple + Google reject without these for a fintech-adjacent app | S | PROJECT.md requirement. Block submission, not development. |
| TS-15 | **Firestore security rules in repo + enforced** | Without rules, every authenticated user can read every group. Non-negotiable for multi-user. | M | Rules-as-code. Members read only groups they belong to; only foreman writes cycle/payment for their groups. |
| TS-16 | **Per-environment Firebase config** via `app.config.ts` + `expo-constants` | Today hardcoded (`firebase.ts:5-12`); cannot ship dev + prod | S | PROJECT.md requirement. |

### Differentiators (Competitive Advantage)

What ChittiApp can do that Margadarsi / Shriram / Kapil cannot — because they are *operator-tied* apps and we are a *group-tooling* app.

| # | Feature | Value Proposition | Complexity | Notes |
|---|---------|-------------------|------------|-------|
| D-1 | **Splitwise-style contact invite** — pick from phone contacts, send WhatsApp/SMS deep link (`chitti://join/...`), pending invite resolves when invitee signs in with that phone | The reason Splitwise won. Operator apps make you call a branch. Friends-and-family chits live in contacts. | M | `expo-contacts` (Expo SDK 56 supported). Deep link via existing `linking.config`. Decide fate of existing `memberTokens/{token}` link. |
| D-2 | **Member-of-truth ledger** — every subscriber sees the same numbers from their own device, can verify against the foreman's view | No operator app gives this — they show you *your* row only. ChittiApp shows everyone the whole table (the chit is communal by law). | M | Read model on top of TS-4 + TS-6. |
| D-3 | **Dispute-grade bid history** — every bid in an auction stored, not just the winner | DOMAIN.md §6 calls this out as table-stakes for real operators; subscriber apps don't expose it; ChittiApp does and that's a trust moat | M | Subcollection `cycles/{n}/bids/*`. Required when D-6 (auction modes) lands. |
| D-4 | **Money-conservation invariant visible to the user** — "₹100,000 in = ₹70,000 winner + ₹5,000 commission + ₹1,250 × 20 dividend" shown as a checked equation on every conducted cycle | Turns abstract math into a trust artifact. No operator does this. Reinforces "the app is correct" positioning. | S | UI affordance on top of TS-9 runtime check. |
| D-5 | **Configurable dividend application policy** (current month vs next month, rounding rule) per group | DOMAIN.md §6 — real operators differ on this and every existing app hardcodes one choice. Configurability lets a real chit migrate in. | S | `dividendApplication: 'currentMonth' \| 'nextMonth'`, `roundingRule: 'down' \| 'nearest' \| 'up'`. |
| D-6 | **Async auction mode** — open bid window for X hours; lowest bid at close wins; tie → lottery | The biggest UX win over physical chits. Members in different cities can bid. Operator apps require physical attendance or scheduled video calls (Muthoot does video). | L | PROJECT.md scopes `auction-live` + `auction-async` as "v1 if scope allows". Async is the bigger differentiator; live needs sockets/realtime listeners. |
| D-7 | **WhatsApp / SMS share-out of cycle results** ("Cycle 5 conducted. Winner: Ravi. Dividend ₹1,250. Your next due ₹3,750.") via `Share` API | Until push notifications land (deferred to v2), this fills the gap. Foreman shares one tap → group WhatsApp. Aligns with India usage pattern. | S | `react-native` `Share`, message templates. |
| D-8 | **Multi-language UI** — English + Telugu + Tamil + Kannada + Hindi at minimum | Operator apps are typically English-only or one regional language. Real chits run in regional languages. Big trust signal. | M | `i18next` or `react-i18next`. Defer to v1.x unless a beta partner blocks. Worth scoping early so strings aren't hardcoded. |
| D-9 | **Foreman dashboard** — collection rate this month, arrears age, who hasn't paid, cycle countdown | Subscriber-side operator apps don't give the foreman a tool; foremen use spreadsheets. ChittiApp serves the foreman as a first-class user. | M | New `ForemanDashboardScreen`. Aggregations over `payments` subcollection. |
| D-10 | **Export group ledger to CSV / PDF** | Foreman needs this for their own records and (eventually) state Registrar filings. Operator apps assume *they* file. | M | `expo-sharing` + CSV generator. PDF via `expo-print` (Expo SDK 56 supported). |
| D-11 | **Audit log per group** — every membership change, cycle conducted, payment marked, with actor + timestamp | Direct extension of D-2; if there's ever a dispute, the log is the answer | S | Append-only `audit/{groupId}/events/*` subcollection. |
| D-12 | **Dark mode** (already implemented) | Indian users skew dark-mode in low-light contexts; current implementation is a real plus | — | Already shipped via `ThemeContext`. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that *will* be asked for and must be politely declined for v1 — usually because they break the track-only constraint or trigger regulation.

| # | Feature | Why Requested | Why Problematic | Alternative |
|---|---------|---------------|-----------------|-------------|
| AF-1 | **In-app payment** (UPI collect, card, netbanking) | "Why do I have to pay outside the app?" | Turns ChittiApp into a payment aggregator → RBI PA-PG licence, settlement account, escrow, NBFC adjacency. Per PROJECT.md, this is the line that defines the product. | UPI **deep links** (`upi://pay?pa=…`) launch GPay/PhonePe; user pays there; foreman marks paid. (Deferred v2 per PROJECT.md.) |
| AF-2 | **KYC of subscribers** (PAN / Aadhaar / video KYC) | "How do I trust a stranger in my chit?" | Triggers DPDP-Act handling of sensitive PII, plus we'd be promising a verification we can't deliver | Foreman vouches; phone-OTP is identity floor. Document this clearly in onboarding. |
| AF-3 | **Open marketplace** — join chits run by strangers | "Like MoneyFellows" | MoneyFellows is a licensed financial institution in Egypt. In India this is the **prized-chit-scheme** regulatory category that killed Saradha and Rose Valley. Off the table. | Invite-only by foreman. The whole product is "your chit, in an app". |
| AF-4 | **Credit scoring / lending against future dividends** | "Bridge me till my draw" | NBFC. Stop. | None. Out of scope forever. |
| AF-5 | **Multi-foreman SaaS billing** | "Let me run 50 chits and charge subscribers a platform fee" | PROJECT.md explicit out-of-scope. Pricing model unsolved; legal posture changes. | Free tool for v1. Monetisation is a post-PMF decision. |
| AF-6 | **Real-time chat inside group** | "Like WhatsApp" | They already have WhatsApp. We'd be a worse WhatsApp. Push-notification infra cost, moderation surface, retention nightmares. | One-tap **share to WhatsApp** (D-7). Audit log carries the official record. |
| AF-7 | **AI auction advisor** — "you should bid ₹X" | Buzz | Liability magnet. Wrong advice on someone's life savings = legal exposure. | Show **historical bid range** + dividend impact calculator (read-only math, no recommendation). v2. |
| AF-8 | **Web app as a supported surface** | "I want to use my laptop" | `signInWithPopup` / `RecaptchaVerifier` are dying paths; doubling test surface for v1 burns the budget | `react-native-web` continues to build for dev, but not promised. PROJECT.md is clear. |
| AF-9 | **Registrar-of-Chits e-filing** | "Help me register the chit legally" | Stateful per-state portals; massive scope; not the product | Out-of-scope per PROJECT.md. Future "compliance pack" if there's demand. |
| AF-10 | **Approval gate for membership** ("subscriber accepts invite before being added") | "Consent flow" | Friction without changing reality — the foreman has already onboarded the person in real life | Leader-direct adds per PROJECT.md key decision; phone owner first-login = implicit consent. |
| AF-11 | **Real-money escrow / "we hold the pot"** | "Make it safer" | NBFC + PA. Same as AF-1, harder. | None. |
| AF-12 | **Crypto / token / "chit-on-chain"** | Speculation | Adds zero value, multiplies risk and ops burden | Hard no. |

---

## Feature Dependencies

```
TS-1 (phone-OTP native auth)
    └─ blocks ─> everything user-facing
        └─ TS-4 (multi-user data model)
               ├─ TS-3 (add member by phone)
               ├─ TS-5 (My Chits home, role-aware)
               ├─ TS-6 (cycle ledger, member-scoped reads)
               ├─ TS-10 (member ledger view)
               ├─ TS-15 (Firestore rules — meaningless until multi-user)
               ├─ D-1  (contact invite)
               ├─ D-2  (member-of-truth view)
               └─ D-9  (foreman dashboard)

TS-2 (group params: C, N, f, d_max)
    └─ blocks ─> TS-9 (cycle math with commission)
                     ├─ TS-11 (caps + prized-once)
                     ├─ TS-13 (receipts — show the math)
                     ├─ D-4  (money-conservation UI)
                     └─ D-5  (dividend application policy)

TS-8 (lottery + manual draw)
    └─ enhanced by ─> D-6 (async auction)
                          └─ requires ─> D-3 (bid history subcollection)

TS-6 (cycle ledger) + TS-7 (mark payment)
    └─ enhanced by ─> D-9 (foreman dashboard aggregations)
                          └─ enhanced by ─> D-10 (CSV/PDF export)
                          └─ enhanced by ─> D-11 (audit log)

TS-16 (env-based Firebase config) + TS-15 (security rules)
    └─ blocks ─> store submission (TS-14)

D-8 (i18n) ──conflicts──> "ship fast with hardcoded English strings"
    (Not a real conflict — but if strings get hardcoded in v1, i18n becomes a global refactor.
     Scope i18n infra in v1 even if only English ships; defer translation.)

AF-1 (in-app payment) ──conflicts──> entire product thesis (track-only)
```

### Dependency Notes

- **TS-4 (multi-user) is the keystone.** Nothing member-side has meaning until the per-user subtree (`users/{uid}/groups/*`) is replaced with a top-level `groups/{groupId}` + `memberships`. Every D-* feature transitively depends on it. Schedule it first after TS-1.
- **TS-1 (native phone auth) is the absolute first thing.** The login screen throws on device today. Until that's fixed, no real-device testing of anything else is possible.
- **TS-9 (commission math) is a one-line bug fix in `chitti.ts` but it must land with TS-2 (schema field) and D-4 (visible invariant) as a single unit.** Shipping the wrong dividend in any beta build will burn trust we cannot rebuild.
- **D-6 (async auction) requires D-3 (bid history).** If async auction makes v1, bid-history subcollection is in v1 by transitive dependency.
- **D-1 (contact invite) requires deep-link infra that already exists** (`AppNavigator.tsx:20` `linking.config`). Reuse, don't rebuild. Decide what to do with the legacy `memberTokens/{token}` collection (PROJECT.md deferred decision).
- **D-8 (i18n) is cheap if scoped early, expensive if retrofitted.** Even if v1 ships English-only, route every user-facing string through `t()` from day one.
- **TS-15 (Firestore rules) is the only authorization boundary** — there's no server. The rules are not optional and not a "polish later" item; they ship the moment TS-4 ships or the prototype is publicly exploitable.

---

## MVP Definition

### Launch With (v1)

The smallest set that lets a real foreman run a real 20-month chit end-to-end on the app, with subscribers signed in on their own phones.

- [ ] **TS-1** Native phone-OTP auth (iOS + Android, working on physical device)
- [ ] **TS-16** Env-based Firebase config (`app.config.ts` + `expo-constants`)
- [ ] **TS-4** Multi-user group data model + Firestore migration plan
- [ ] **TS-15** Firestore security rules in repo, enforced
- [ ] **TS-2** Group creation with C, N, T=N, f, d_max, payment day
- [ ] **TS-3** Add member by phone number (leader-direct, no approval)
- [ ] **TS-5** "My Chits" home with role badge + next due / next draw
- [ ] **TS-6** Cycle ledger (subcollection-backed, not whole-doc writes)
- [ ] **TS-7** Foreman marks payment received with payment-mode label
- [ ] **TS-8** Conduct draw — lottery + manual-entry
- [ ] **TS-9** Cycle math with foreman commission + money-conservation runtime assertion
- [ ] **TS-10** Member ledger view (own dues, dividends, payment history)
- [ ] **TS-11** d_max + prized-once enforcement
- [ ] **TS-12** Native confirm dialogs, native pickers, gesture-correct nav
- [ ] **TS-13** Per-cycle in-app receipt / statement view
- [ ] **TS-14** Privacy policy + Terms + store metadata
- [ ] **D-1** Splitwise-style contact invite (WhatsApp/SMS deep link)
- [ ] **D-2** Member-of-truth ledger view (every member sees same numbers)
- [ ] **D-4** Money-conservation invariant displayed on conducted cycles
- [ ] **D-7** WhatsApp / SMS share-out of cycle results (fills push-notification gap)
- [ ] **D-11** Audit log (append-only, per group)

### Add After Validation (v1.x)

- [ ] **D-3** Bid history subcollection (lights up when async auction lands)
- [ ] **D-6** Async auction mode — bid window + close + tie-break-by-lot
- [ ] **D-5** Configurable dividend application policy
- [ ] **D-9** Foreman dashboard (collection rate, arrears age)
- [ ] **D-10** CSV / PDF export of group ledger
- [ ] **D-8** i18n — Telugu / Tamil / Kannada / Hindi (infra in v1, translations in v1.x)
- [ ] **Push notifications** (Expo Push / FCM) for due-date, draw-day, results — PROJECT.md deferred v2 but this is the highest-priority v1.x add
- [ ] **Live auction** mode (real-time bids; needs Firestore listeners hardening)
- [ ] **Receipt PDF export** (extends TS-13)

### Future Consideration (v2+)

- [ ] **Arrears + penalty interest** model (DOMAIN.md §6) — defer until real chits report what they actually do
- [ ] **Guarantor / security** capture for prized members
- [ ] **Set-off** arrears against accrued dividend
- [ ] **Defaulter substitute admission** workflow
- [ ] **UPI deep links** (`upi://pay?pa=…`) — launches GPay/PhonePe, foreman still marks paid (PROJECT.md deferred v2)
- [ ] **Foreman's own ticket / first-month auto-prize** representation
- [ ] **Registrar deposit tracking** (informational only, not filing)
- [ ] **Foreman-side analytics** — chit profitability, member churn, average bid depth
- [ ] **Multi-chit foreman tooling** (single foreman running >5 chits needs different home screen)
- [ ] **Possible SaaS/billing layer** — only post-PMF, only if foremen ask

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| TS-1 native phone auth | HIGH | MEDIUM | P1 |
| TS-4 multi-user data model | HIGH | HIGH | P1 |
| TS-9 commission + money-conservation math | HIGH | LOW | P1 |
| TS-2 Act-compliant group params | HIGH | LOW | P1 |
| TS-15 Firestore security rules | HIGH | MEDIUM | P1 |
| TS-6 cycle ledger (subcollection) | HIGH | MEDIUM | P1 |
| TS-7 mark-payment | HIGH | LOW | P1 |
| TS-8 lottery + manual draw | HIGH | LOW | P1 |
| TS-10 member ledger view | HIGH | MEDIUM | P1 |
| TS-13 per-cycle receipt (in-app) | HIGH | MEDIUM | P1 |
| TS-3 add member by phone | HIGH | LOW | P1 |
| TS-5 My Chits home | HIGH | LOW | P1 |
| TS-11 d_max + prized-once enforcement | HIGH | LOW | P1 |
| TS-12 native UX (Alert, pickers) | HIGH | LOW | P1 |
| TS-14 privacy / terms / store metadata | HIGH | LOW | P1 |
| TS-16 env-based Firebase config | MEDIUM | LOW | P1 |
| D-1 Splitwise contact invite | HIGH | MEDIUM | P1 |
| D-2 member-of-truth ledger | HIGH | MEDIUM | P1 |
| D-4 money-conservation UI | MEDIUM | LOW | P1 |
| D-7 WhatsApp share-out | HIGH | LOW | P1 |
| D-11 audit log | MEDIUM | LOW | P1 |
| D-6 async auction | HIGH | HIGH | P2 |
| D-3 bid history | MEDIUM | MEDIUM | P2 (P1 if D-6 in v1) |
| D-9 foreman dashboard | MEDIUM | MEDIUM | P2 |
| D-10 CSV/PDF export | MEDIUM | MEDIUM | P2 |
| D-5 dividend application policy | MEDIUM | LOW | P2 |
| Push notifications | HIGH | MEDIUM | P2 |
| D-8 i18n (infra) | MEDIUM | MEDIUM | P2 (infra in v1) |
| D-8 i18n (translations) | MEDIUM | LOW | P2 |
| Live auction mode | MEDIUM | HIGH | P3 |
| Arrears / penalty model | MEDIUM | HIGH | P3 |
| Guarantor capture | LOW | LOW | P3 |
| UPI deep links | MEDIUM | LOW | P3 |
| AF-* (anti-features) | — | — | NEVER |

**Priority key:** P1 = launch (v1). P2 = v1.x add. P3 = v2+. NEVER = out of scope per PROJECT.md.

---

## Competitor Feature Analysis

| Feature | Margadarsi / Shriram / Kapil (Indian operator apps) | MoneyFellows (Egypt ROSCA) | Splitwise | ChittiApp Approach |
|---------|---------------------------|------------|-----------|---------------------|
| Identity | Customer-ID + OTP, tied to operator's CRM | Phone OTP | Email + phone | **Phone OTP** (Splitwise/MoneyFellows pattern; not customer-ID-locked) |
| Group creation | Branch staff create chit; subscriber joins existing chit | Platform creates "circles"; users join | User creates groups freely | **Foreman creates group in app**; no platform gatekeeping (the differentiator vs operator apps) |
| Membership | Subscriber joins one operator's chit; KYC at branch | Smart-matched by platform | Invite by contact / email | **Leader invites by phone** (Splitwise-style; no platform matching, no KYC) |
| Money movement | Pay via cards / netbanking / NACH to operator | Platform collects + disburses (regulated FI) | None — track only | **None — track only** (Splitwise model; differentiates from operator and from MoneyFellows) |
| Auction | View-only for subscriber; physical or video-conference bid (Muthoot) | Smart-matched payout order; no live auction | N/A | **In-app async auction** (v1.x); lottery + manual (v1). Differentiates from operator passivity. |
| Dividend ledger | Per-subscriber statement, operator-computed | N/A (different ROSCA model) | Balance per pair | **Per-cycle dividend + money-conservation invariant visible to all members** |
| Receipts | Operator-issued PDF/SMS | Auto-generated | Expense receipt scan | **In-app receipt view (v1) → PDF export (v1.x)** |
| Notifications | SMS + push (operator-side) | Push | Push + email | **WhatsApp share-out in v1**; push notifications v1.x (PROJECT.md deferred) |
| Languages | English + one regional (usually) | Arabic + English | 30+ languages | **i18n infra v1; English at launch; Telugu/Tamil/Kannada/Hindi v1.x** |
| Audit / dispute | Operator's word; physical agreement | Platform-mediated | Activity feed | **Append-only audit log per group** (D-11) — uniquely possible because multi-user |
| Multi-account group | No — every operator app is single-user | No — circles are platform-mediated | Yes | **Yes — the entire premise** |

---

## Sources

Indian operator apps (table-stakes calibration):

- [Margadarsi Chits on Google Play](https://play.google.com/store/apps/details?id=com.margadarsi.customer)
- [MyMargadarsi on App Store](https://apps.apple.com/in/app/mymargadarsi/id6452721116)
- [Margadarsi FAQ — process](https://www.margadarsi.com/faq)
- [Shriram Chits Subscriber Services](https://www.shriramchits.in/subscriber.php)
- [Shriram Chits AP/TS E-Payment on Google Play](https://play.google.com/store/apps/details?id=com.svs.shri_ap_chit)
- [Kapil Chits on Google Play](https://play.google.com/store/apps/details/Kapil_Chits?id=kapil.chits)
- [Kapil Chits on App Store](https://apps.apple.com/in/app/kapil-chits/id1575314897)
- [Kapil Chits — How a chit works](http://www.kapilchits.com/howchitwork.aspx)
- [Muthoot Chits](https://muthootchits.com/)
- [Muthoot Pappachan Group fintech launch — CIO](https://www.cio.com/article/218429/muthoot-pappachan-group-launches-chit-business-powered-by-fintech.html)
- [Balussery Chits — how it works](https://balusserychitsonline.com/chit-funds/how-it-works/)

Global ROSCA / chama / paluwagan apps (differentiator scan):

- [MoneyFellows TechCrunch — $13M raise + model](https://techcrunch.com/2025/05/04/moneyfellows-raises-13m-to-take-its-group-savings-model-outside-egypt/)
- [MoneyFellows 10 things — Zoonop](https://zoonop.com/articles/moneyfellows)
- [MyChama.app](https://mychama.app/)
- [Roscas.io — free app for managing savings circles](https://roscas.io/)
- [Zenlipa — choosing a Chama app](https://zenlipa.co.ke/blog/looking-for-the-best-chama-app-to-download-here-s-what-to-know-before-you-choose-one)
- [Paluwagan complete guide — Sinkingfund.app](https://sinkingfund.app/blog/what-is-paluwagan-complete-guide-filipino-group-savings)

Splitwise (UX / invite pattern reference):

- [Splitwise on App Store](https://apps.apple.com/us/app/splitwise/id458023433)
- [Splitwise on Google Play](https://play.google.com/store/apps/details?id=com.Splitwise.SplitwiseMobile)
- [Android Central — Splitwise as group expense hack](https://www.androidcentral.com/apps-software/the-app-splitwise-is-the-best-hack-to-split-group-trip-expenses-in-2026)
- [Robots.net — how to use Splitwise mobile app](https://robots.net/fintech/how-to-use-the-splitwise-mobile-app/)

B2B chit-fund software (foreman-tool calibration):

- [Chit.Biz Customer App](https://chit.biz/customer-app)
- [Chit.Biz Collection App](https://chit.biz/collection-app)
- [Mazenet MazeChit](https://www.mazenettech.com/mazechit/)
- [Premad chit-fund software](https://premad.in/chit-fund-software)

Domain canon (do not re-research):

- `E:\chittiapp\ChittiApp\.planning\research\DOMAIN.md` — Chit Funds Act 1982 math, money-conservation invariant, gap analysis
- `E:\chittiapp\ChittiApp\.planning\PROJECT.md` — scope contract (v1 active, deferred, out of scope, key decisions)
- `E:\chittiapp\ChittiApp\.planning\codebase\ARCHITECTURE.md` — current data layer and anti-patterns
- `E:\chittiapp\ChittiApp\.planning\codebase\STRUCTURE.md` — file layout

---

*Feature research for: consumer mobile chit-fund tracking (India)*
*Researched: 2026-05-22*
