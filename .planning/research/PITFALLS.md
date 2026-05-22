# Pitfalls Research

**Domain:** Consumer mobile chit-fund tracker (Splitwise-style, India) on Expo SDK 56 + Firebase
**Researched:** 2026-05-22
**Confidence:** HIGH on domain math and Firestore data-model pitfalls (Context7 / official docs verified). MEDIUM on Play Store / Apple submission specifics for India finance-adjacent apps (verified against current Play Console policy pages, May 2026). MEDIUM on Phone-Auth deliverability (Firebase docs verified; carrier-specific behavior is empirical).

This file extends — does not repeat — the already-catalogued anti-patterns in `.planning/codebase/ARCHITECTURE.md` (Anti-Patterns) and `.planning/codebase/CONCERNS.md` (Tech Debt / Known Bugs / Security). Those are about *where the prototype is today*. This file is about *what commonly breaks for projects going where ChittiApp is going*.

---

## Critical Pitfalls

### Pitfall 1: Floating-point money — silent ₹0.01 drift that breaks the money-conservation invariant

**What goes wrong:**
`dividend_per_subscriber = (discount − f × C) / N` rarely divides evenly. If you store dividends as JS `number` and apply them to next-cycle subscriptions, you accumulate ₹0.01–₹0.50 errors per cycle. By month 20 of a ₹1,00,000 chit the displayed ledger is off by a few rupees vs `N × subscription`, and the runtime money-conservation assertion (`N × subscription == winner + commission + dividend × N`) starts firing — or worse, you suppress the assertion and the foreman quietly absorbs / pockets the rounding.

**Why it happens:**
JS `0.1 + 0.2 !== 0.3`. Developers reach for `Math.round(x * 100) / 100`, which fixes display but not arithmetic identity. The Act and real foreman practice both round to the **paisa** (₹0.01), and the rounding residue is conventionally absorbed by the **foreman** (or the **winner**, by group policy) — never silently distributed.

**How to avoid:**
- Store all money as **integer paisa** (`number` of paisa, not rupees). Add `src/utils/money.ts` with `Paisa = number` brand and `toRupees(p)` / `fromRupees(r)` helpers. Reject `Date` / `number` rupee values at the type boundary.
- In `src/utils/chitti.ts` `calculateDividend`, compute `(discount − f*C)` in paisa, then `Math.floor(distributable / N)` for `dividend_per_subscriber`, and assign the **residue** (`distributable − dividend * N`) to a configurable `roundingBeneficiary` (default: foreman). Record both fields on the cycle.
- Add a Jest test that fuzzes 10,000 random (C, N, f, discount) tuples and asserts `pot == winner + commission + dividend*N + rounding_residue` exactly.

**Warning signs:**
- Any use of `parseFloat`, `toFixed(2)`, or `/100` in cycle math.
- `dividendPerMember: number` field stored as decimal rupees in Firestore.
- Money-conservation assertion is a `console.warn` rather than a throw / test failure.

**Phase to address:** Domain-math phase (before any multi-user data work). Must land before the Firestore schema is rewritten, because changing the unit later requires a data migration.

---

### Pitfall 2: Prized-once enforcement done client-side only — leader (or compromised client) can re-prize a member

**What goes wrong:**
`Member.hasReceived` lives in the group document. The Draw screen filters eligible members in JS. If a malicious or buggy client writes a cycle where the winner already has `hasReceived = true`, Firestore accepts it. The Act's hard rule ("a prized subscriber shall not bid again") is silently violated and the ledger becomes legally indefensible.

**Why it happens:**
Track-only apps assume "the foreman runs it honestly." But in a multi-device world, members read the same data and *will* dispute. Firestore security rules are usually written for *who can write* not *what they can write*.

**How to avoid:**
- Encode prized-once as a Firestore security-rule invariant: on a cycle write, require `resource.data.winnerId` to be a member whose `hasReceived` was `false` in the *prior* group state. Use `getAfter()` to verify the same write sets that member's `hasReceived = true`.
- Move winner assignment into a Firestore transaction (`runTransaction`) that reads the member's prized state, asserts non-prized, then writes both cycle and member atomically.
- Maintain `group.prizedMemberIds: string[]` as a denormalized index; rules can cheaply check `!(winnerId in resource.data.prizedMemberIds)`.

**Warning signs:**
- `DrawScreen.confirmDraw` does separate `setDoc(cycle)` and `setDoc(member)` calls.
- `firestore.rules` for cycle writes only check role, not winner state.
- No test exercising "leader tries to re-prize Member X."

**Phase to address:** Multi-user data-model phase — security rules and transactions must land together with the schema rewrite.

---

### Pitfall 3: Dividend application timing — "applied to current month" vs "next month" computed inconsistently across views

**What goes wrong:**
The Act allows either policy: dividend reduces the **current** cycle's subscription, or the **next** cycle's. Real foremen vary. If you don't capture the policy on the group and apply it in *one* place, the Leader view shows "₹3,750 due" for cycle 6 while the Member view shows "₹5,000 due" for the same cycle, because each view computed dividend timing differently.

**Why it happens:**
The "apply dividend" logic ends up duplicated in `PaymentTrackingScreen`, `MemberDetailScreen`, `MemberPublicViewScreen`, and any future receipts/exports. Plus a common confusion: the *first* cycle has no prior dividend, so the rule "next month" produces an off-by-one if the first cycle is treated as month 0 vs month 1.

**How to avoid:**
- Add `ChittiGroup.dividendApplication: 'current' | 'next'` (default `'next'`, the more common pattern).
- Single pure function `effectiveSubscription(group, cycleIndex, memberId): Paisa` in `src/utils/chitti.ts`. Every screen calls this. Unit-test with fixtures for cycle 1 (no prior dividend), cycle 2 (first applied dividend), and a prized member whose obligation continues without further dividend benefit beyond their win.
- Display the formula on screen: "Subscription ₹5,000 − dividend ₹1,250 = ₹3,750" so disputes are self-explanatory.

**Warning signs:**
- More than one file computes `amount - dividend`.
- Member view and Leader view show different "due" amounts for the same (cycle, member).
- No first-cycle vs subsequent-cycle test.

**Phase to address:** Domain-math phase, alongside paisa migration.

---

### Pitfall 4: Agreement date vs first-instalment date vs draw date confusion

**What goes wrong:**
Real chits have **three** dates: agreement signed (legal), first instalment due (cash flow), first draw conducted (operational). Often the same; often not (e.g., agreement signed 15th, first instalment due 1st of next month, first draw 5th). Modeling only `startDate` causes: cycle numbering off by one, member statements showing "month 3" when the operator calls it "month 2," and the "current cycle" pointer being wrong all month long.

**Why it happens:**
The existing `ChittiGroup.startDate` / `startMonth` / `startYear` ambiguity (already flagged in `CONCERNS.md` for legacy groups) compounds when members from different time zones load the same group.

**How to avoid:**
- Three fields: `agreementDate`, `firstInstalmentDate`, `firstDrawDate` (all ISO date strings, no times).
- `getCurrentCycle(group, today)` is a pure function keyed off `firstInstalmentDate` + `paymentDueDay`. **Store dates as strings in IST** (`YYYY-MM-DD` in `Asia/Kolkata`), never `new Date()` of a server timestamp — Firestore Timestamps render differently on devices in different time zones.
- Validate at create time that `firstInstalmentDate >= agreementDate` and `firstDrawDate >= firstInstalmentDate`.

**Warning signs:**
- Any `new Date(...).getMonth()` in domain code.
- `serverTimestamp()` used for anything other than audit logs.
- Cycle numbering varies between member devices on the same group.

**Phase to address:** Domain-math phase.

---

### Pitfall 5: Per-user `users/{uid}/groups/*` migration treated as a copy — orphans the entire member-side experience

**What goes wrong:**
The natural-but-wrong migration is "copy each user's groups into a shared `groups/*` collection, keep `ownerId` pointing at the original uid." Result: the leader sees their groups; **no member sees anything** because there is no index from `phone → uid → groupIds`, and no Firestore rule that lets a member read a group they were added to. You ship a "multi-user" app that is single-user in practice.

**Why it happens:**
Splitwise-style invite flows have a delicate sequencing problem: at the moment the leader adds a phone number, **that phone may not yet be a signed-in uid**. The mapping is established later when the phone owner signs in. People forget to bind the two.

**How to avoid:**
- Top-level `groups/{groupId}` document with `memberPhones: string[]` (E.164, no separator) and `memberUids: string[]` (populated lazily).
- Top-level `phoneIndex/{e164Phone}` → `{ uid, displayName }` written by a Firestore trigger / Cloud Function on `onAuthStateChanged` first-login, OR on app foreground if Cloud Functions are out of scope. Document that this is the only place phone→uid mapping lives.
- On member-side load, query `groups where memberPhones array-contains <my phone>`. On every group write, recompute `memberUids` from `memberPhones` via `phoneIndex`.
- Firestore rule for `groups/{gid}` read: `request.auth.uid in resource.data.memberUids || request.auth.token.phone_number in resource.data.memberPhones`. The second clause covers the lag between sign-in and `memberUids` backfill.
- Migration script (one-shot): for each `users/{uid}/groups/{gid}`, create `groups/{gid}` with `ownerUid = uid`, `memberPhones = members.map(m => normalize(m.phone))`, `memberUids = [uid]`. Run with a dry-run flag first; log every group whose member phones can't be parsed to E.164.

**Warning signs:**
- A member signs up, sees an empty Home screen, even though the leader "added" them.
- `memberUids` is the only access predicate (no phone fallback) → new members locked out until cron backfill runs.
- Migration script reads documents and writes them inside the same Promise.all (no batching → Firestore quota exhaustion mid-migration → partial state).

**Phase to address:** Multi-user data-model phase. This *is* the phase.

---

### Pitfall 6: Phone-number normalization — `+91 9876543210`, `09876543210`, `9876543210`, `+919876543210` all treated as different identities

**What goes wrong:**
The leader types "9876543210", the member signs in via OTP as "+919876543210", and the lookup `memberPhones array-contains <auth.token.phone_number>` returns nothing. Member sees no groups. You debug for hours.

**Why it happens:**
Indian numbers are often entered without country code. Firebase Phone Auth always returns E.164 (`+91...`). The two never meet.

**How to avoid:**
- Single normalization function `toE164(input, defaultCountry = 'IN'): string | null` in `src/utils/phone.ts`. Use `libphonenumber-js` (small, RN-compatible). Reject anything that doesn't parse.
- Normalize on **input**: `AddMember` screen normalizes before write. Display the normalized form in the UI so the leader sees `+91 98765 43210` and can confirm.
- Normalize on **read** too as a defensive backstop. Add a Firestore rule that rejects writes to `memberPhones` containing non-E.164 strings (`matches('^\\+[1-9]\\d{6,14}$')`).
- The `phoneIndex/{phone}` document ID **must** be the E.164 form — pick one canonical form and never deviate.

**Warning signs:**
- `member.phone` field contains mixed formats in production.
- Country code is hardcoded `+91` somewhere as string concatenation.
- Phone is used as both display value and lookup key without a separate `phoneDisplay` field.

**Phase to address:** Auth phase, with multi-user data-model. Must be solved before phone-based invites are wired up.

---

### Pitfall 7: Firebase Phone Auth on Expo SDK 56 — auth state lost on cold start; reCAPTCHA verifier crashes on native

**What goes wrong:**
Two distinct failure modes already exist in the codebase (`CONCERNS.md`) and will recur if the rewrite uses the same pattern:
1. `getAuth(app)` without RN persistence → user re-logs in every cold start.
2. `RecaptchaVerifier` against a DOM id → throws on iOS/Android.

The *new* pitfall to flag: even when you fix (1) with `initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })`, the TypeScript types for `getReactNativePersistence` are missing from `firebase` ^12 (open issue `firebase/firebase-js-sdk#9316`), so it compiles only with `// @ts-expect-error` or a manual `as any`. People then "fix" the type error by deleting the line and silently breaking persistence.

Additionally: Firebase JS SDK's Phone Auth on RN **requires** `expo-firebase-recaptcha` (which Expo deprecated) OR a switch to `@react-native-firebase/auth` (which is incompatible with Expo Go, requires EAS Build + dev client). There is no path that is *both* Expo-Go-friendly *and* shipping native phone OTP.

**How to avoid:**
- Decide explicitly: **EAS Build + `@react-native-firebase/auth` for production, Firebase JS SDK only for web preview.** Document this in `STACK.md` as a key decision.
- If staying on Firebase JS SDK (because EAS Build is deferred), use Expo's recommended path: `firebase/auth` + `initializeAuth` + a *signInWithCustomToken* flow backed by a tiny Cloud Function that verifies OTP via Twilio Verify or MSG91 (Indian SMS provider with better deliverability). This costs more, but works on Expo Go.
- Wrap persistence init in a single `src/lib/firebase.ts` factory, with a runtime check: if `auth.currentUser` is null after AsyncStorage hydrate completes, log a warning. Add a smoke test that signs in, force-closes the app, reopens, and asserts the user is still signed in.

**Warning signs:**
- `@ts-expect-error` or `as any` on `getReactNativePersistence`.
- `package.json` includes both `firebase` and `@react-native-firebase/*` (pick one).
- App works in Expo Go but auth breaks in EAS build (or vice versa).
- Login screen still mounts a `<View nativeID="recaptcha-container" />`.

**Phase to address:** Auth phase. Block all other phases on this decision.

---

### Pitfall 8: SMS deliverability in India — Jio / Airtel filtering Firebase OTP messages, app appears broken to ~10% of users

**What goes wrong:**
Firebase Phone Auth routes through Google's own SMS infrastructure, which is **not** registered with India's TRAI DLT (Distributed Ledger Technology) framework. Indian carriers — particularly Jio and BSNL — increasingly drop SMS from non-DLT-registered senders as "promotional" or "spam." Users sit on the OTP screen, never receive a code, give up. There is no error surfaced to your app: Firebase reports "sent."

**Why it happens:**
TRAI's DLT regulation (2020+, enforcement tightened through 2024–2025) requires all transactional SMS in India to be sent under a registered Header + Template ID. Firebase's global SMS templates are not DLT-registered for many sender IDs. Google's quotas (10K free for IN) don't help when the carrier drops the message.

**How to avoid:**
- For v1 launch: accept Firebase OTP as default but add a "Didn't receive code? Call me" fallback using Firebase's voice-call OTP (available in Phone Auth). Voice-call goes through telephony, bypasses SMS filters.
- For v1.1 / scale: route OTP through MSG91, Karix, or Twilio Verify with a DLT-registered template, using Firebase `signInWithCustomToken` for the final auth step. This is the only path to reliable Indian SMS at scale.
- Measure: log `phoneAuth.attempted`, `phoneAuth.smsSent` (Firebase callback), `phoneAuth.otpEntered`, `phoneAuth.success`. If `otpEntered/smsSent < 0.7` you have a deliverability problem.
- Document the carrier-failure UX prominently in the support FAQ.

**Warning signs:**
- Support tickets clustered around "OTP not received" from specific PIN codes / carriers.
- Conversion from "phone entered" to "OTP entered" below 75%.
- No instrumentation distinguishing "user didn't enter OTP" from "user didn't receive OTP."

**Phase to address:** Auth phase (build fallback UX). Scale phase (switch to DLT-registered provider).

---

### Pitfall 9: Account recovery when SIM is lost — "phone is identity" with no recovery path locks users out of their chit history

**What goes wrong:**
Member loses phone or changes number. They sign up fresh with the new number, see an empty Home screen. Their entire chit history (and their `prized` status) lives under the old phone. Now the leader has to manually update `memberPhones` for that group — and there is no UX for it. Worst case: leader doesn't believe the member, member is locked out of their own subscriptions and dividends.

**Why it happens:**
Splitwise-style apps treat phone as primary key. Real-world phone numbers churn (~5–10% annually in India). Nobody designs for it on day 1.

**How to avoid:**
- Add a **leader-initiated phone change** flow: leader edits `memberPhones[i]` from old to new. Atomic Firestore transaction updates `phoneIndex`, recomputes `memberUids`, and writes an audit log entry (`auditLog: { actor, action: 'memberPhoneChanged', before, after, at }`).
- Add an audit-log subcollection per group from day 1 — even before you build the UI for it. Every write goes through a helper that appends an entry. This is also the foundation for Pitfall 13 (dispute resolution).
- Document in the privacy policy and onboarding: "Your phone number is your identity. If you change numbers, ask your leader to update your record."

**Warning signs:**
- No `phoneChangedAt` / `previousPhones: string[]` field on member.
- Leader UI has no "edit member phone" action.
- Support gets requests for "I lost my number" with no documented procedure.

**Phase to address:** Multi-user data-model phase (build the storage + audit log). UX phase (build the leader action).

---

### Pitfall 10: Firestore 1 MB document cap — group document explodes once you add bid history + audit log

**What goes wrong:**
Already-flagged: at 30 members × 30 cycles the existing single-document design pushes ~250 KB. Add Act-compliant **bid history per cycle** (every bid, not just winner — required for dispute resolution) and an **audit log** (Pitfall 9, 13) and you blow past 1 MB by month ~15 of a 30-member group. Firestore rejects the write, the leader can't conduct a draw, the entire group is bricked.

**Why it happens:**
The prototype's single-document aggregate seemed convenient. Real chits accumulate writes monotonically.

**How to avoid:**
Subcollection-from-day-one architecture:

```
groups/{groupId}                                  -- ~10 KB: metadata, member roster, settings
groups/{groupId}/cycles/{cycleId}                 -- ~5 KB each: one per month
groups/{groupId}/cycles/{cycleId}/bids/{bidId}    -- ~200 B each: full bid history
groups/{groupId}/cycles/{cycleId}/payments/{memberId}  -- ~300 B each: paid/unpaid + paidAt
groups/{groupId}/auditLog/{entryId}               -- ~400 B each: append-only
phoneIndex/{e164}                                 -- ~100 B each: phone→uid lookup
```

- Use `onSnapshot` listeners per subcollection so screens stream updates instead of refetching the whole tree.
- Member roster (~30 members × ~200 B = ~6 KB) stays in the group doc for cheap rule evaluation; everything else is a subcollection.
- Pre-launch load test: simulate 50 members × 50 cycles × 5 bids/cycle. Verify group doc stays under 200 KB.

**Warning signs:**
- `upsertGroup(g)` still exists and writes the whole tree.
- Any field on the group document is an unbounded array.
- `cycles` is a field on the group, not a subcollection.

**Phase to address:** Multi-user data-model phase — schema and subcollections land together. Reversing this later is a real migration.

---

### Pitfall 11: Concurrent writes — leader marks payment on Device A, member marks "I paid" on Device B, last write wins

**What goes wrong:**
Even with subcollections, two clients writing to the *same* `payments/{memberId}` document simultaneously will clobber each other. Worse: the leader bulk "mark all paid" reads cycle state, applies changes locally, writes 30 payment documents in a loop — and a concurrent member write to one of those documents is lost.

**Why it happens:**
Firestore is last-write-wins by default. Developers assume `setDoc` is atomic per call (true) and forget that read-modify-write across calls is not atomic.

**How to avoid:**
- All multi-document updates wrapped in `runTransaction` or `writeBatch`.
- `payments/{memberId}` document has `version: number` (incremented on every write) and security rule rejects writes where `request.resource.data.version != resource.data.version + 1`. Client must read, increment, write — and retry on contention.
- The audit log captures the actor + the version — disputes become resolvable ("you marked it unpaid at version 4; the leader had already marked it paid at version 3").

**Warning signs:**
- `Promise.all([...].map(p => setDoc(...)))` patterns.
- No version field on mutable docs.
- "I marked it paid and it disappeared" reports from users.

**Phase to address:** Multi-user data-model phase, with security rules.

---

### Pitfall 12: Google Play Financial Services policy — chit fund app misclassified as "personal loan," rejected or removed

**What goes wrong:**
Google Play's **Personal Loans in India** policy (Play Console Help, current as of 2025–2026) requires apps that offer/facilitate personal loans in India to be on the RBI's **DLAs Deployed by Regulated Entities** list — with a hard cutoff of **January 28, 2026** for existing apps and immediate enforcement for new submissions since October 30, 2025. Chit funds are **separately regulated** (state Registrar of Chits, Chit Funds Act 1982, not RBI), so they are NOT on the RBI DLA list. A reviewer who skims the listing and sees "monthly subscriptions, payouts, dividend" can easily mis-classify as a personal-loan facilitator and reject. The app is also subject to the broader **Financial Services** declaration, which requires disclosing the financial product type even for tracking-only apps.

**Why it happens:**
Reviewers triage on keywords. "Chit fund," "subscription," "payout," "dividend," "foreman" map onto loan/lending vocabulary. The Play Console Financial Features Declaration form has no dropdown for "chit fund tracker."

**How to avoid:**
- **Frame the app as a *tracker / ledger*, not a financial product.** App title: "Chitti — Chit Group Tracker." Description leads with "Record-keeping for chit groups. App does not handle, hold, or move money."
- In the Financial Features Declaration, select "My app does not facilitate or offer financial services" and add a free-text note: "App is a record-keeping tool for users who run chit funds outside the app. No funds flow through, no lending, no investment offering. The Chit Funds Act, 1982 governs the underlying activity; the app is not a registered chit business."
- In-app: a persistent disclaimer on the Create Group screen and in Settings — "ChittiApp does not handle money. All payments happen outside the app."
- No UPI deep links, no payment buttons, no "deposit / withdraw" language anywhere in copy or icons. This is also why UPI integration is correctly **deferred** in `PROJECT.md`.
- Prepare a one-page "About Chitti" PDF (legal frame, what app does / does not do) ready to attach to a re-review request if rejected.

**Warning signs:**
- App copy uses "invest," "earn," "guaranteed return," "loan," "credit."
- Any UI element resembling a wallet, transaction, or balance with a money icon (₹ next to a number is fine; "Pay ₹5000" button is not).
- App is reachable from Google Search results for "personal loan."

**Phase to address:** Pre-launch / submission phase. Get the listing copy reviewed before binary upload.

---

### Pitfall 13: Apple App Review — finance-adjacent app flagged under guideline 5.1.1 / 5.1.2 (data collection) and 1.4.1 (medical / financial accuracy)

**What goes wrong:**
Apple's App Review is stricter than Google's on finance-adjacent apps shipping from India. Common rejections:
- **Guideline 5.1.1(v):** Account creation requires in-app account deletion (required since Jan 31, 2022). A "delete my account" button must exist *inside* the app, must delete server-side data within 30 days, and must not just sign out.
- **Guideline 5.1.2:** Sharing user data with third parties (Firebase = Google) requires explicit consent and a privacy policy URL.
- **Guideline 4.0 / 1.4.1:** Apps "involving financial transactions or sensitive financial information" may be required to demonstrate authorization. Even for tracking-only, reviewers may demand evidence the app is non-misleading about its scope.
- **App Privacy nutrition labels:** Must declare phone number, contacts (if used), usage data — and link them to purposes. Missing or inaccurate = rejection.

**Why it happens:**
India-developer-account + financial-keyword listings get extra scrutiny. The "ship it without disclaimers" path is the default.

**How to avoid:**
- Build a real in-app **Delete Account** flow before submission: deletes the user from Firebase Auth + nullifies their `uid` in every `memberUids` array they appear in + removes their `phoneIndex` doc. Show a confirmation modal explaining "this does not delete the chit groups you participate in — only your account; the leader can re-add you by phone."
- Privacy Policy + Terms of Service hosted on a real URL (GitHub Pages is acceptable). Linked from Login screen and Settings. Reviewed before submission.
- App Privacy nutrition label: declare `Contact Info → Phone Number` (linked to user account, used for app functionality), `Identifiers → User ID` (Firebase uid), `Usage Data` (only if you add analytics). Be honest; if Apple finds undeclared data collection on traffic inspection, you're banned.
- Submission notes: "ChittiApp is a record-keeping tool for chit fund participants. The app does NOT process payments, hold funds, offer investments, or facilitate lending. The Chit Funds Act, 1982 regulates the underlying activity; this app is not a registered chit business. Demo credentials: phone +91-XXXXXXXXXX, OTP XXXXXX (Firebase test number)."
- Set up Firebase **test phone numbers** with fixed OTPs so the reviewer can sign in without an Indian SIM. Without this, Apple review *will* be unable to log in and *will* reject under 2.1.

**Warning signs:**
- No "delete account" button.
- Privacy policy is a placeholder.
- Submission lacks demo credentials → reviewer rejects under "couldn't test."
- App store copy uses "invest" / "earn returns."

**Phase to address:** Pre-launch / submission phase. Delete-account flow must be a roadmap item, not a last-week scramble.

---

### Pitfall 14: India DPDP Act (Phase 2, November 2026) data-deletion windows misaligned with chit-fund retention needs

**What goes wrong:**
India's Digital Personal Data Protection Act Phase 2 takes effect November 2026 — within ChittiApp's plausible operating horizon. It requires deletion of personal data within **7–90 days** of consent withdrawal or purpose completion, with 48-hour pre-deletion notice. But the Chit Funds Act + state Registrar rules require chit records (ledgers, agreements, member identities) to be **retained for years** for audit. The two collide: a member withdraws consent, you must delete; the foreman must retain.

**Why it happens:**
Developers implement "delete account" as `delete everything tagged with this uid.` That destroys the chit ledger for *other* members. DPDP has an exemption for legal/regulatory retention, but you must invoke it correctly.

**How to avoid:**
- "Delete account" deletes **identity** (`users/{uid}`, `phoneIndex/{phone}`) but **anonymizes** appearances in groups: replace `member.name` with "Former Member", null out `member.phone`, keep `memberId` so the cycle ledger remains intact and money-conservation still holds.
- Add `member.deletionStatus: 'active' | 'anonymized' | 'pending'` + `member.deletionRequestedAt`.
- Document the policy in the privacy notice: "If you withdraw consent, your personal identifiers are removed within 30 days. Anonymized cycle / payment records are retained for 8 years as required by chit-fund recordkeeping obligations."
- Build a cron job (Cloud Function or scheduled Cloud Run) that processes pending deletions and audit-logs each one.

**Warning signs:**
- Deletion logic does `where('uid', '==', x).delete()` everywhere.
- No `deletionStatus` enum on member.
- Privacy policy makes promises ("we delete all your data") the architecture can't keep.

**Phase to address:** Pre-launch / submission phase, before November 2026 enforcement starts.

---

### Pitfall 15: Trust & dispute resolution — no append-only evidence chain, foreman's word vs member's word becomes the entire story

**What goes wrong:**
Member says "I paid on the 5th." Leader's app shows "unpaid." There is no record of when the leader last marked, no record of who marked, no record of when the member tried to mark. Disputes degenerate into screenshot wars on WhatsApp, the leader's authority erodes, and the group abandons the app.

**Why it happens:**
The "fast path" is: tap, write, done. The audit log feels like over-engineering until the first dispute.

**How to avoid:**
- Append-only `groups/{gid}/auditLog/{ts_uuid}` subcollection. Every write to a payment, cycle, member, or group setting writes an entry: `{ at: serverTimestamp, actor: uid, actorPhone, actorRole: 'leader'|'member', action: 'paymentMarked' | 'paymentUnmarked' | 'winnerSelected' | 'memberAdded' | 'memberPhoneChanged' | 'groupSettingsChanged', before: {...}, after: {...}, deviceInfo: { platform, appVersion } }`.
- Security rule: `auditLog` is **append-only** — `allow create: if request.auth != null && incomingMatchesActor(); allow update, delete: if false;`. Not even the leader can rewrite history.
- Member view exposes a per-member "Activity" tab showing every action that affected their record. Leader view shows the group-wide log.
- Per-payment "marked by [name] at [time]" pill in the UI — disputes self-resolve when both parties can see the same record.

**Warning signs:**
- Mutations go straight to the doc with no log entry.
- `actor` field is computed client-side without security-rule enforcement.
- Leader can delete log entries (means an angry leader can erase evidence).

**Phase to address:** Multi-user data-model phase (write path + rules). UX phase (display).

---

### Pitfall 16: Foreman commission edge cases — first-cycle no-auction, foreman-as-subscriber, commission on lottery cycles

**What goes wrong:**
Common operator conventions the prototype's math ignores:
- **First cycle has no auction**, foreman takes the prize at full chit value `C`. No discount, no dividend. But the prototype assumes every cycle has a discount.
- **Foreman is also subscriber 21** in a 20-subscriber group (they hold a ticket). They contribute subscriptions and receive dividends like everyone else, AND collect commission. Double-counting them as `member` vs `foreman` is easy.
- **Lottery cycle has zero discount → zero distributable → commission still owed?** Yes, by convention `f × C` is paid every cycle to the foreman; in a no-discount cycle this comes out of the pot itself, making the winner receive `C - f*C` instead of `C`. The prototype's `calculateDividend` doesn't model commission at all, so it'll show the lottery winner getting full `C` — wrong.

**How to avoid:**
- Model `cycle.drawType ∈ {'auction', 'lottery', 'manual', 'foreman-prize'}`. The `'foreman-prize'` type takes `winnerId = group.foremanMemberId`, `discount = 0`, `commission = f*C`, `dividend = 0` — only valid in cycle 1 if group is configured `foremanTakesFirstCycle: true`.
- Lottery cycle math: `prize = C - f*C`, `commission = f*C`, `dividend = 0`. Auction: `prize = C - discount`, `commission = f*C`, `dividend = (discount - f*C)/N`. Auction can produce negative dividend if `discount < f*C` → reject the bid as invalid at submit time.
- `foremanMemberId` is just a `memberId` like any other; foreman participates as a subscriber by default. Add `member.isForeman: boolean` flag for UI purposes only — math treats them as a member.
- Property test: for every legal `(C, N, f, drawType, discount)` combo, money conservation holds.

**Warning signs:**
- `Cycle.drawType` doesn't include a "foreman-prize" or "no-draw" option.
- `calculateDividend` doesn't take `f` (foreman commission) as input.
- Tests cover only auction cycles.

**Phase to address:** Domain-math phase.

---

### Pitfall 17: Discount cap (`d_max`) and minimum-bid validation enforced only in UI

**What goes wrong:**
Act caps discount at 30% of C (40% by agreement). UI form has a `max` attribute. Leader uses a different client (or modified APK) and submits a 50% discount. Firestore accepts, dividend math runs negative, group is corrupted.

**How to avoid:**
- `firestore.rules` for cycle write: `request.resource.data.discount <= getGroupAfter(/databases/$(database)/documents/groups/$(gid)).data.maxDiscountPct * resource.data.chitValue / 100`.
- Same for `discount >= 0`, `commission == groupCommissionPct * chitValue`, `winnerId in groupMemberIds`, `!(winnerId in groupPrizedMemberIds)`.
- Whitelist `drawType`. Reject unknown values.

**Phase to address:** Multi-user data-model phase (rules ship with schema).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep single-document `users/{uid}/groups/{gid}` after multi-user rewrite | Smaller diff, no migration script | Cannot share groups across uids — defeats the entire premise of v1 | Never |
| Store money as decimal rupees (`number`) | "Easier to read in Firestore console" | Rounding drift, money-conservation violations, dispute disasters | Never |
| Skip audit log "until disputes happen" | One less subcollection to maintain | First dispute is the one you lose | Never |
| Firebase JS SDK with custom-token OTP via Cloud Function for v1 launch | Stays on Expo Go, no EAS Build setup | Requires Cloud Functions + paid SMS provider (~₹0.30/SMS) | Acceptable if EAS Build is a known follow-up milestone |
| Skip in-app "delete account" until reviewer asks | One less screen | App Store rejection, 1–2 week resubmit cycle | Never (Apple guideline 5.1.1(v) since 2022) |
| Trust client-side `member.hasReceived` filter | No rule complexity | Disputed re-prize event corrupts ledger | Never |
| Ship without Firestore security rules ("we'll add later") | Faster prototype iteration | World-readable PII, Play / Apple data-collection violation, regulator concern | Never past prototype |
| Hardcode `+91` country code | Skip libphonenumber-js dep | NRIs (UK +44, US +1) excluded; multi-country chits impossible | Acceptable for v1 (India-only is explicit scope) — but normalize through one function so flipping later is trivial |
| Skip DLT-registered SMS provider for v1 | No third-party SMS contract | ~10% of users in deliverability holes, support load, retention churn | Acceptable for v1 *if* voice-call OTP fallback exists |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Firebase Auth on RN | `getAuth(app)` without `getReactNativePersistence(AsyncStorage)` | `initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })` on native; `getAuth(app)` on web; branch on `Platform.OS` |
| Firebase Phone Auth on Expo SDK 56 | Reusing web `RecaptchaVerifier` on native | Either switch to `@react-native-firebase/auth` (requires EAS Build, no Expo Go) OR use Cloud Function + Twilio/MSG91 + `signInWithCustomToken` |
| Firestore writes from RN | `JSON.parse(JSON.stringify(obj))` to strip `undefined` | `initializeFirestore(app, { ignoreUndefinedProperties: true })` |
| Firestore concurrent writes | `setDoc` in a loop assuming atomicity | `writeBatch` for batch, `runTransaction` for read-modify-write |
| Firebase Phone Auth in India | Default Firebase SMS sender (not DLT-registered) | Voice-call fallback in UI; production: DLT-registered provider via custom token |
| Expo deep links | Hardcode `chitti-app-edfb1.web.app` host | Universal Links + Android App Links with verified `assetlinks.json` / `apple-app-site-association` on a stable owned domain |
| App.json / EAS | Use Expo Go to test phone auth | Phone Auth on Firebase JS SDK does NOT work in Expo Go reliably — only EAS dev client or `@react-native-firebase` works on device |
| Firestore security rules | Test rules in console only, not in CI | `firebase emulators` + `@firebase/rules-unit-testing` in Jest; rules in `firestore.rules` in repo |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Whole-group read on every screen focus | Slow Home navigation, high Firestore read costs | `onSnapshot` listener per screen + subcollections | Already broken; gets worse past 5 groups / 20 members |
| Unbounded `cycles[]` array in group doc | Write rejected with "document too large" | Cycles as subcollection from day one | 1 MB cap hit around 30 members × 30 months with bid history |
| `where('memberPhones', 'array-contains', ...)` without index | Slow member-side Home load | Firestore composite index on `(memberPhones, archived, createdAt)`; commit `firestore.indexes.json` | 100+ groups in the database |
| Phone-index Cloud Function not idempotent | Duplicate `phoneIndex` entries on retries | Use phone as doc ID with `set` (idempotent), not auto-id with `add` | First production retry |
| No pagination on `getGroups` | Home freezes for power users | `query(..., orderBy('updatedAt', 'desc'), limit(20))` + infinite scroll | 50+ groups (foreman running many) |
| Listening to `groups/*` (collection-wide) on Home | High billing, real-time updates spam | Listen to `groups where memberPhones array-contains <me>` only | Multi-tenant scale (1000+ groups in DB) |
| Auction live mode using Firestore as PubSub | Bid latency 500ms–2s, draws feel laggy | For `auction-live` mode (v1 scope-permitting), use Realtime Database, not Firestore | Once auction-live ships |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Firestore rules check role but not field values | Leader can write `discount = 95%`, corrupt ledger | Validate every numeric field range in `firestore.rules`; whitelist enums |
| Public `memberTokens` collection exposes all members' PII | Anyone with token URL sees full member roster (already flagged) | Decide before launch: kill the public link entirely OR project to a redacted view via Cloud Function |
| Storing `member.phone` plaintext in shared groups | A leaked group export = entire member contact list | E.164 only; document in privacy policy; consider hashing for `phoneIndex` lookup (PBKDF2 with app-pepper) |
| Leader can rewrite audit log | Leader can erase evidence in a dispute | `allow update, delete: if false` on `auditLog/**` |
| `request.auth.token.phone_number` trusted without sign verification | Forged token reads any group | Firebase already signs ID tokens — but never trust phone *claim* alone; require `request.auth.uid in resource.data.memberUids` as primary, phone match as backstop |
| No Firebase App Check | Anyone with the API key can hammer your Firestore | Enable App Check (Play Integrity on Android, DeviceCheck on iOS, reCAPTCHA v3 on web); enforce in rules with `request.app != null` |
| OTP-bypass via Firebase test phone numbers in production | Anyone discovering the test number signs in as any user | Test numbers configured ONLY in dev Firebase project; production project has none |
| Logging phone numbers / OTPs to console / Sentry | PII leak into ops tooling | Sanitize logs; never log `member.phone` directly |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Foreman-only language ("Conduct draw," "Mark paid") on member-side screens | Members confused by buttons they can't use | Role-based UI: members see "View draw," "Confirm I paid"; leaders see actions |
| Surfacing money math without showing the formula | Members don't trust the number, ask leader to "explain again" | "₹3,750 = ₹5,000 subscription − ₹1,250 dividend (from Cycle 4 auction discount ₹30,000)" inline |
| OTP screen with no "didn't receive" affordance | User stuck for 5 min, gives up | "Resend (30s)" countdown + "Call me with code" voice-OTP button after 60s |
| Adding a member by name without showing the normalized phone back | Leader thinks they added the right person; phone has typo | Show parsed E.164 in confirmation: "Add +91 98765 43210 (Rahul)?" |
| Cycle dates shown in device locale, not group locale | Members across time zones see different "due dates" | Always render in `Asia/Kolkata` with explicit IST label |
| Silent auto-conduct on "All paid" tap | Leader fat-fingers, draws happen unintentionally | Explicit "Conduct Draw" CTA, separate from payment marking; require non-prized member count > 0 |
| No member-side dispute / flag action | Member has to call leader on the phone | "Disagree with this record" button → opens an audit-log entry with member comment, leader notified |
| Treating "leader" and "owner" as the same | First foreman moves on, group is bricked because there's no co-leader concept | Deferred to v2 in PROJECT.md — but design `groupRoles: { uid: 'owner' | 'leader' | 'member' }` from day 1 so it's not a future migration |

## "Looks Done But Isn't" Checklist

- [ ] **Money conservation:** Asserted in tests AND at runtime AND covered by property-based fuzz tests across (C, N, f, discount, drawType) — verify by deleting one assertion at a time and confirming the test suite catches it.
- [ ] **Multi-user group:** Sign in as user A (leader), add user B by phone. Sign in fresh as user B with that phone, see the group on Home — *without* the leader having to do anything.
- [ ] **Phone-OTP on physical iOS + Android:** EAS-built binary installed on a real device with a real Indian SIM, OTP received, session persists across cold start. Tested on at least one Jio and one Airtel SIM.
- [ ] **Account deletion:** "Delete account" button in Settings → confirms → user signed out → re-signing in shows new-user state, group's `memberUids` no longer contains the old uid, `phoneIndex/{phone}` is gone.
- [ ] **Native confirmations:** Every destructive action uses `Alert.alert` (not `window.confirm`); verified on iOS + Android, not just web preview.
- [ ] **Firestore rules:** `firestore.rules` in repo, tested with `@firebase/rules-unit-testing` in CI, deployed via `firebase deploy --only firestore:rules` (not edited in console).
- [ ] **Audit log:** Every payment toggle, draw, member add/remove, phone change writes an entry. Rules prevent update/delete. Visible in member UI.
- [ ] **Privacy policy + Terms:** Hosted on real URL, linked from Login + Settings + App Store / Play Store listings. Both store listings reference them.
- [ ] **App Privacy nutrition labels (Apple):** Phone, user ID, contact info declared. No undeclared data collection (verify with Charles Proxy on a release build).
- [ ] **Play Financial Features Declaration:** Submitted, explicit "does not facilitate financial services" with explanatory note. Listing copy reviewed for loan/invest/earn language.
- [ ] **Demo credentials for App Review:** Firebase test phone number + fixed OTP added to App Store Connect "App Review Information," matching test number in submission notes.
- [ ] **Universal Links / App Links:** `apple-app-site-association` and `.well-known/assetlinks.json` hosted at a stable domain; `chitti://` scheme NOT the only deep-link path.
- [ ] **Migration from `users/{uid}/groups/*`:** Dry-run script with explicit count of groups migrated, members with un-normalizable phones logged, idempotent re-runs verified, rollback path documented.
- [ ] **Money displayed as integer paisa internally, formatted on render:** grep for `parseFloat` / `toFixed` outside `src/utils/money.ts`.
- [ ] **Foreman commission applied:** `calculateDividend` takes `f` as parameter; lottery cycles deduct commission; foreman-prize cycle 1 supported if configured.
- [ ] **Prized-once enforced server-side:** Firestore rule rejects winner already in `prizedMemberIds`. Verified with a manual rules-unit test that tries to re-prize a member.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Money drift discovered post-launch | HIGH | Snapshot all groups, run reconciler that recomputes paisa from authoritative inputs (chit value, discounts, drawn winners, foreman commission rate), write residue corrections as an explicit "rounding correction" cycle entry with audit-log note. Notify affected leaders. |
| Play Store rejection under Financial Services policy | MEDIUM | Reword listing (remove finance keywords), refile Financial Features Declaration with explanatory text, attach "About Chitti" PDF, request re-review. 1–2 week cycle. Worst case: pivot listing to "expense / record-keeping tracker" category. |
| App Store rejection under 5.1.1(v) | LOW | Build in-app delete-account flow, resubmit. 3–5 day cycle. |
| Migration from `users/{uid}/groups/*` partial / corrupt | MEDIUM | Migration must be idempotent + dry-run-first. Recovery = restore Firestore export from pre-migration, fix script, re-run. Cost = downtime + user-visible state loss if any writes happened in between. |
| Phone number reused by different person after churn | MEDIUM | Audit log + leader-initiated phone-change flow + "this account was previously associated with another user" warning at sign-in if `phoneIndex/{phone}` exists with `lastSeenAt` > 6 months ago. |
| Group document hits 1 MB | HIGH | Migration of in-flight groups to subcollections — atomic per group, write-locked during migration. Avoid by going subcollection-first from day one. |
| Leader and member disagree on a payment | LOW (if audit log exists) | Open per-payment activity view, both parties see "marked paid by leader at 5 Jun 14:33; marked unpaid by leader at 6 Jun 09:12." Self-resolves. |
| Firebase Phone Auth SMS not delivered to a user | LOW | Voice-call OTP fallback in UI. Production fix: switch to DLT-registered SMS via Cloud Function + `signInWithCustomToken`. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Floating-point money drift | Domain math | Property test: 10K random (C,N,f,d) all satisfy money-conservation exactly |
| 2. Prized-once enforcement | Multi-user data model + rules | Rules-unit test rejects re-prize write |
| 3. Dividend application timing | Domain math | Single `effectiveSubscription` function; same value on leader and member views |
| 4. Date confusion | Domain math | Three explicit date fields; `getCurrentCycle` unit-tested across time zones |
| 5. Migration orphans member views | Multi-user data model | E2E test: leader adds B, B signs in fresh, B sees group |
| 6. Phone normalization | Auth + multi-user data model | `toE164` is the only writer of phone fields; lint rule rejects raw phone strings |
| 7. Firebase Auth on RN | Auth | Cold-start persistence test on EAS-built device binary |
| 8. India SMS deliverability | Auth (v1: fallback UX); Scale (v1.1: DLT provider) | Voice-OTP fallback in UI; conversion metrics dashboard |
| 9. Account recovery on SIM loss | Multi-user data model + UX | Leader-initiated phone-change action; audit log entry; documented support flow |
| 10. Firestore 1 MB cap | Multi-user data model | Subcollection architecture; load test 50×50×5 stays under 200 KB |
| 11. Concurrent write race | Multi-user data model + rules | Version field; transaction-based writes; rules-unit test |
| 12. Play Financial Services policy | Pre-launch / submission | Listing copy review; Financial Features Declaration with explanatory note |
| 13. Apple App Review red flags | Pre-launch / submission | Delete-account flow shipped; nutrition labels accurate; demo creds in App Review notes |
| 14. DPDP retention conflict | Pre-launch / submission | Anonymize-on-delete logic; privacy policy aligned with retention reality |
| 15. Trust & dispute resolution | Multi-user data model (storage) + UX (display) | Audit log subcollection + rules + per-payment activity view |
| 16. Foreman commission edge cases | Domain math | Tests cover lottery, foreman-prize, no-auction cycles |
| 17. Discount cap server-side | Multi-user data model + rules | Rules-unit test rejects discount > maxDiscountPct |

## Sources

- [Chit Funds Act, 1982 (India Code)](https://www.indiacode.nic.in/bitstream/123456789/21348/1/the_chit_funds_act,_1982.pdf) — discount cap, foreman commission cap, prized-once rule
- [Google Play — Personal Loans in India policy](https://support.google.com/googleplay/android-developer/answer/16604194?hl=en) — RBI DLA list requirement, Oct 2025 / Jan 2026 cutoffs
- [Google Play — Financial features declaration](https://support.google.com/googleplay/android-developer/answer/13849271?hl=en) — declaration form, attestation
- [Google Play — Financial Services](https://support.google.com/googleplay/android-developer/answer/13161491) — policy scope
- [Apple — Account deletion in apps required since Jan 31, 2022](https://developer.apple.com/news/?id=mdkbobfo) — App Review guideline 5.1.1(v)
- [Apple App Store Review Guidelines (5.1.1, 5.1.2, 1.4.1, 4.0)](https://developer.apple.com/app-store/review/guidelines/) — finance-adjacent app criteria
- [Firebase Authentication Limits](https://firebase.google.com/docs/auth/limits) — India SMS quotas, abuse mitigation
- [Expo — Using Firebase](https://docs.expo.dev/guides/using-firebase/) — JS SDK vs `@react-native-firebase/*` tradeoffs on Expo
- [firebase/firebase-js-sdk#9316 — getReactNativePersistence missing from types](https://github.com/firebase/firebase-js-sdk/issues/9316) — known TS pitfall
- [India DPDP Act mobile app compliance (Phase 2 Nov 2026)](https://respectlytics.com/blog/india-dpdp-act-mobile-app-compliance/) — data-deletion windows, finance app conflict
- [Data Retention under India's DPDP Rules](https://ksandk.com/data-protection-and-data-privacy/data-retention-and-deletion-under-indias-dpdp-rules/) — 7–90 day deletion windows + legal retention exemptions
- [Firestore Security Rules — getAfter / cross-document reads](https://firebase.google.com/docs/firestore/security/rules-conditions) — enforcing prized-once and discount cap in rules
- `.planning/research/DOMAIN.md` — money-conservation invariant, worked example
- `.planning/codebase/CONCERNS.md` — extends rather than repeats already-catalogued prototype issues

---
*Pitfalls research for: ChittiApp (consumer chit-fund tracker, India, Expo SDK 56 + Firebase)*
*Researched: 2026-05-22*
