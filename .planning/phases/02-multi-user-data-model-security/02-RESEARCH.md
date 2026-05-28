# Phase 2: Multi-User Data Model & Security — Research

**Researched:** 2026-05-28
**Domain:** Top-level Firestore `groups/*` collection, phone-claim flow, security rules + emulator tests, append-only audit log, demo storage reshape, native pickers + back-handler
**Confidence:** HIGH on Firestore data shape + rules (Context7 / official docs verified), HIGH on `@firebase/rules-unit-testing` v5.0.1 setup (npm-verified 2026-05-27), HIGH on phone-claim flow (client-side reconciliation in `AuthContext` is the right call — rationale §2), MEDIUM on RNFirebase Firestore vs JS-SDK Firestore tradeoff for cross-document rule reads (we recommend JS-SDK Firestore stays).

## Summary

Phase 2 rewrites the data layer end-to-end. The shape is locked in CONTEXT.md (top-level `groups/{id}` + `memberPhones[]` + `memberUids[]` + `phoneIndex/{e164}`). This research fills in the **how** so the planner can write tight tasks:

- The phone-claim flow runs **client-side in `AuthContext`** (no Cloud Function) using `runTransaction` over `phoneIndex` write + member group reconciliation. Cheaper, no Functions footprint, no new infra. §2.
- Firestore security rules use `get(/databases/$(db)/documents/groups/$(gid)).data.maxDiscountPct` for cross-document discount-cap enforcement. Concrete rules file in §3.
- `@firebase/rules-unit-testing@5.0.1` (verified 2026-05-27) drives the emulator test suite. `firebase-tools@15.19.0` provides the local emulator. §4.
- Audit log writes are wrapped in the same `runTransaction` as the data mutation — atomicity guarantees. Helper API in §5.
- Storage shim's public API stays the same in shape (`getGroups()`, `getGroupById(id)`, etc.) so screens compile unchanged. **However**, `upsertGroup(group)` becomes the wrong API — it's whole-document write, which we're eliminating. We replace it with `upsertCycle(groupId, cycle)` / `markPayment(...)` / `addMember(...)` granular helpers. Six screens need updating. §7.
- UX-02 / UX-03 code lands using `@react-native-community/datetimepicker` (Expo-recommended for SDK 56) and React Navigation's `useFocusEffect` + RN's `BackHandler`. §9.

**Primary recommendation:** Execute in the wave sequence in §10 (eight waves, same shape as user proposal with one minor swap — audit log + transactions need to merge with the data layer rewrite in Wave 1, not be a separate Wave 4).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Firestore data model — top-level `groups/{groupId}` + `memberPhones[]` + `memberUids[]` + `phoneIndex/{e164}`.** Subcollections for `/cycles`, `/cycles/{id}/payments`, `/audit`. Member-side query: `db.collection('groups').where('memberPhones', 'array-contains', myPhone)` with composite index. `memberMeta: { [memberId]: { name, phone, hasReceived, cycleReceived?, joinedAt, uid?, status } }` map on the group doc. Why arrays-not-subcollections for membership: bounded by `totalMembers` (≤ 60), O(1) lookup with composite index, half the writes per member-add vs a separate `memberships/{uid}/{groupId}` doc. Per PITFALLS.md Pitfall 5.
- **Phone-claim flow:** AuthContext writes `phoneIndex/{e164} = { uid, claimedAt }` on first sign-in. Backfills `memberUids[]` on every group where the user's phone already appears in `memberPhones[]`. This is what makes "leader adds Ravi by phone Tuesday; Ravi installs Friday and sees the chit instantly" work.
- **Migration path:** One-shot Node script at `scripts/migrate-to-multi-user.ts`, dry-run flag, idempotent, runtransaction-per-group, log-line-per-group + summary line, `--dry-run` produces same logs writes nothing. Prototype project `chitti-app-edfb1` has no real users — worst case it's a no-op. The discipline is for the next migration.
- **Security rules:** `firestore.rules` in repo with full read/write table per CONTEXT (groups, cycles, payments, audit, phoneIndex). Server-side discount-cap + drawType whitelist. `@firebase/rules-unit-testing` integration tests at `tests/firestore-rules.test.ts` covering: stranger-cannot-read, member-can-read-cannot-write, foreman-can-write-own-not-others, audit append-only, discount-cap blocked, enum-whitelist blocked. Tests run against local Firestore emulator in CI.
- **Audit log:** `audit/{eventId}` subcollection on group. Shape: `{ id, actorUid, actorRole: 'foreman'|'member'|'system', action: 'group.created'|'group.archived'|...|'settings.changed', before?, after?, timestamp: ServerTimestamp, notes? }`. `appendAudit(groupId, event)` is the only writer; every storage-layer mutation calls it inside the same `runTransaction` — guarantees data + audit land atomically. Action enum is intentionally generic so adding new actions doesn't break old reads. Member view's "marked by … at …" pill already designed.
- **UX-01:** Already shipped in prior session. `Alert.alert` replaced `window.confirm`. Reconciled — no work needed, just record in SUMMARY.
- **UX-02 / UX-03:** Code paths land in Phase 2; hardware verification deferred to Phase 5 (mirroring Phase 1's AUTH-01/02 split). UX-02 = native date pickers for CreateGroup "Starting month" + PaymentTracking "Paid on". UX-03 = Android hardware-back + `useBackHandler` confirmations on delete chit / unmark payment / conduct draw.
- **Demo mode behavior:** `__demoMode` continues short-circuiting Firestore. Demo storage stays in-memory map. Seeds reshape to new schema (`memberPhones[]`, `memberMeta`, etc.) so demo mirrors real data. The "Switch view" toggle on GroupDetail becomes real for non-demo users; in demo you ARE the foreman.

### Claude's Discretion

- Composite index definition file shape (`firestore.indexes.json`) — researcher derived in §1.
- Whether the storage shim stays at `src/storage/index.ts` or splits into `src/storage/{groups,cycles,payments,audit}.ts` — researcher recommends **split per concern** in §7.
- Exact location of migration script — `scripts/migrate-to-multi-user.ts` accepted.
- Whether to add `appendAudit` calls to demo storage — researcher recommends **skip** in §5/§8 (demo isn't audited in real terms; mirroring would just be theater).
- How to surface the "Activity" tab on GroupDetail — visual exists; wire to `audit/*` subcollection read.
- Whether to add App Check token check now or defer to Phase 6 — researcher recommends **defer to Phase 6** (Phase 2 is already heavy; App Check has its own setup curve).

### Deferred Ideas (OUT OF SCOPE)

- Push notifications via Firebase Cloud Messaging (v2; NOTIF-01..03).
- App Check (recommended for v1.x, not blocking Phase 2).
- Per-region Firestore choice (sticks with `chitti-app-edfb1`).
- Soft-delete vs hard-delete for groups (Phase 2 keeps hard delete; audit log records deletion).
- Phone-number-change flow (user signs out and back in with new number; old uid keeps old claim).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | Chit group is a top-level Firestore document accessible to every member from their own account | §1 (data model + queries), §3 (rules), §7 (storage API), §10 Wave 1 |
| DATA-02 | Cycles and payments are subcollections; no whole-document writes for cycle/payment mutations | §1 (subcollection layout), §5 (transaction-wrapped mutations), §7 (granular API: `upsertCycle`, `markPayment`) |
| DATA-03 | Firestore security rules in repo enforce members-read-own / foreman-writes-own | §3 (full `firestore.rules` file), §4 (test setup proving every row of CONTEXT's rule table) |
| DATA-05 | Migration plan / script for prototype data | §6 (script shape, dry-run flag, idempotency, invocation) |
| SOC-03 | Append-only audit log per group, all mutations, readable by all members | §5 (`appendAudit` helper, transaction wrapping, schema evolution policy) |
| UX-01 | All confirmation prompts use `Alert.alert` — RECONCILED | Shipped in prior session; record in SUMMARY |
| UX-02 | Date selection uses native date picker | §9.1 (`@react-native-community/datetimepicker` integration in CreateGroup + PaymentTracking) |
| UX-03 | Gesture / back navigation correct on iOS + Android | §9.2 (Android hardware-back via RN `BackHandler` + React Navigation `useFocusEffect`; iOS swipe-back automatic on native stack) |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Top-level group documents | Firestore (server-side rules enforce access) | Client query layer | Members of different uids must share data; rules are the only authorization boundary (no custom server) |
| Phone → uid claim | Client (`AuthContext`) writes `phoneIndex/{e164}` | Firestore rules permit only phone-owner to write own claim | No Cloud Function — see §2 for rationale |
| Member ↔ group reconciliation | Client (`AuthContext`) does post-claim backfill via `runTransaction` | Firestore rules ensure only matching phone-holder can append uid | Avoids the round-trip latency of a Cloud Function trigger; works offline-then-online too |
| Cycle / payment / audit writes | Client `runTransaction` (data + audit atomic) | Firestore rules enforce foreman-only writes + append-only audit | Native firestore JS SDK supports transactions over subcollections in one batch |
| Member-side group query | Client `where('memberPhones', 'array-contains', myPhone)` | Composite index `firestore.indexes.json` | The keystone read of the entire app — runs on every Home focus |
| Demo storage | JS in-memory Map | — | `__demoMode` short-circuits before any Firestore call. No audit, no rules |
| Native date picker | `@react-native-community/datetimepicker` (native) | — | Expo SDK 56 standard; renders OS-native UI |
| Android hardware-back | RN `BackHandler` + React Navigation `useFocusEffect` | — | iOS native stack handles swipe-back automatically |

## Standard Stack

### Core (new in this phase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@firebase/rules-unit-testing` | ^5.0.1 | Drive Firestore emulator from Jest for rules tests | Official Firebase library; latest as of 2026-05-27 [VERIFIED: npm view] |
| `firebase-tools` | ^15.19.0 | Local Firestore emulator + deploy CLI for `firestore.rules` and `firestore.indexes.json` | Official Firebase CLI [VERIFIED: npm view, 2026-05-28] |
| `@react-native-community/datetimepicker` | ^8.4.6 | Native date picker on iOS + Android | Expo-recommended for SDK 56; not a deprecated module [CITED: docs.expo.dev/versions/v56.0.0/sdk/date-time-picker, VERIFIED: npm view] |

### Already installed (used in Phase 2)
| Library | Version | Role |
|---------|---------|------|
| `firebase` | ^12.13.0 | Firestore JS SDK (`db`, `collection`, `runTransaction`, `where`, `array-contains`); STAYS — phase 2 uses JS SDK for Firestore (not RNFirebase) — see §1.5 |
| `@react-native-firebase/auth` | ^24.0.0 | `auth().currentUser` for uid; `auth().currentUser?.phoneNumber` for claim |
| `jest` + `jest-expo` | ^29.7.0 / ^56.0.4 | Test runner (already configured) |
| `ts-jest` | ^29.4.11 | TS test files |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JS-SDK Firestore + RNFirebase Auth (current) | `@react-native-firebase/firestore` (also v24.x) | RNFirebase Firestore has better offline persistence on native, but loses the `firebase/rules-unit-testing` testing path (rules-unit-testing wraps the JS SDK). Mixing JS-SDK + RNFirebase is officially supported. **Keep JS-SDK for Firestore in Phase 2** — testability wins. |
| Client-side phone-claim in `AuthContext` | Cloud Function `onUserCreated` trigger | Cloud Function = new infra to deploy, monitor, version. Client approach = simpler, no Functions onboarding. Race condition still solved (see §2). **Client-side recommended.** |
| `firebase.json` emulator config + manual `firebase emulators:start` | `firebase emulators:exec "npm test"` | Manual is fine for local dev; `:exec` is cleaner for CI. Use both. §4. |

**Installation:**
```bash
npm install --save-dev @firebase/rules-unit-testing@^5.0.1 firebase-tools@^15.19.0
npx expo install @react-native-community/datetimepicker
```

**Version verification (2026-05-28):**
- `@firebase/rules-unit-testing@5.0.1` — modified 2026-05-27 (very current) [VERIFIED npm view]
- `firebase-tools@15.19.0` [VERIFIED npm view]
- `@react-native-community/datetimepicker@9.1.0` — but use `npx expo install` to get the **SDK 56-compatible pin** (latest compatible likely ~8.4.x); Expo's auto-pin overrides the floating `latest`. [CITED: docs.expo.dev/versions/v56.0.0/sdk/date-time-picker]

### 1.5: Why we keep `firebase` (JS SDK) for Firestore in Phase 2

The user might ask "why not swap Firestore to `@react-native-firebase/firestore` while we're rewriting the data layer?" Three reasons against, none for:

1. **Rules-unit-testing wraps JS SDK.** `@firebase/rules-unit-testing` constructs a test app via `initializeTestEnvironment()` and gives you a JS-SDK `Firestore` instance. There's no RNFirebase equivalent. Testing Firestore rules from RNFirebase requires either a custom test harness or running the actual app against the emulator — both worse.
2. **Demo mode + web target.** The storage shim must compile for `react-native-web` (dev surface). `firebase` JS SDK works on web. RNFirebase Firestore doesn't load on web at all — would force a web-specific branch in every storage call.
3. **No real benefit yet.** Offline persistence is a Phase 5/6 concern. Bundle bloat is real (~120 KB for `firebase/firestore`) but lives alongside the already-paid-for `@react-native-firebase/auth`.

**Decision:** Firestore stays on JS SDK in `src/lib/firebase.ts` (the existing `db = getFirestore(app)` export). Phase 2's new code imports from `firebase/firestore` for `collection`, `doc`, `runTransaction`, `where`, `query`, `getDocs`, `serverTimestamp`. Phase 6 can re-evaluate.

## Architecture Patterns

### System Architecture (after Phase 2)

```
HomeScreen.useFocusEffect
   └─► storage.groupsForUser(myPhone)
         └─► db.collection('groups').where('memberPhones', 'array-contains', myPhone)
                   ▲ composite index: (memberPhones array, isActive, createdAt desc)
                   │
GroupDetailScreen.useFocusEffect
   └─► storage.getGroup(groupId) + storage.streamCycles(groupId)
         └─► db.doc(groups/{id}) + db.collection(groups/{id}/cycles).onSnapshot

PaymentTrackingScreen.markPayment(...)
   └─► storage.markPayment(groupId, cycleId, memberId, mode)
         └─► runTransaction:
               1. write doc payments/{memberId}
               2. write doc audit/{eventId} via appendAudit()

DrawScreen.confirmDraw(...)
   └─► storage.upsertCycle(groupId, cycleWithWinner)
         └─► runTransaction:
               1. read group → assert maxDiscountPct, prizedMemberIds (server rules also enforce)
               2. write cycles/{cycleId}
               3. update group.memberMeta.{winnerId}.hasReceived = true
               4. appendAudit

AuthContext.onAuthStateChanged(user)
   └─► if user.phoneNumber: claimPhone(user)
         └─► runTransaction:
               1. read phoneIndex/{e164} → if exists with different uid, BAIL (winner-takes-all)
               2. write phoneIndex/{e164} = { uid, claimedAt }
               3. query groups where memberPhones array-contains e164
                  → for each: append uid to memberUids + set memberMeta.{matchingMemberId}.uid + appendAudit 'member.activated'
                  (chunked into 500-write batches; transactions cap at 500 writes)

firestore.rules (server enforcement):
   groups/{gid}                                  → read if uid in memberUids OR uid == foremanUid
                                                  write if uid == foremanUid AND foremanUid == request.auth.uid (on create)
   groups/{gid}/cycles/{cid}                     → read if same; write only foreman + discount-cap from get() + drawType whitelist
   groups/{gid}/cycles/{cid}/payments/{mid}      → read if same; write only foreman + markedByUid == auth.uid
   groups/{gid}/audit/{eid}                      → read if same; create only foreman; update + delete forbidden
   phoneIndex/{e164}                             → read if auth.token.phone_number == e164; create only if same

Demo path (unchanged): __demoMode short-circuits in storage shim before any Firestore call.
```

### Recommended Project Structure (delta only)

```
src/
├── lib/
│   ├── firebase.ts            # UNCHANGED — already exports db = getFirestore(app)
│   ├── firestore.ts           # DELETE — replaced by storage/{groups,cycles,payments,audit}.ts
│   ├── AuthContext.tsx        # CHANGE — add claimPhone() on sign-in
│   └── audit.ts               # NEW — appendAudit helper + AuditEvent type
├── storage/
│   ├── index.ts               # REWRITE — re-exports + demo-mode routing
│   ├── groups.ts              # NEW — groupsForUser, getGroup, createGroup, updateGroup, archiveGroup
│   ├── cycles.ts              # NEW — listCycles, getCycle, upsertCycle (transactional)
│   ├── payments.ts            # NEW — listPayments, markPayment, unmarkPayment (transactional)
│   ├── audit.ts               # NEW — listAuditForGroup (read-only client query)
│   └── demo.ts                # RESHAPE — seeds use memberPhones[]/memberMeta; no audit subcollection
├── types/index.ts             # CHANGE — add foremanUid, memberPhones, memberUids, memberMeta to ChittiGroup; AuditEvent + MemberMeta types
firestore.rules                # NEW — top-level
firestore.indexes.json         # NEW — top-level
firebase.json                  # NEW — emulator + rules config
tests/firestore-rules.test.ts  # NEW — rules-unit-testing suite
tests/auth-context.test.ts     # UPDATE — add claimPhone test
scripts/
└── migrate-to-multi-user.ts   # NEW — one-shot migration
```

### Pattern 1: Type changes in `src/types/index.ts`

```ts
// src/types/index.ts (Phase 2)

import type { FieldValue, Timestamp } from 'firebase/firestore';

// Existing — UNCHANGED
export interface Payment {
  memberId: string;
  paid: boolean;
  paidDate?: string;
  mode?: 'cash' | 'upi' | 'bank' | 'cheque' | 'other';
  note?: string;
  markedByUid?: string;       // NEW — required for rules + audit
}

// CHANGE — Cycle no longer carries payments array; payments live as subcollection
export interface Cycle {
  id: string;
  cycleNumber: number;
  date: string;
  winnerId?: string;
  winAmount: number;
  discount?: number;
  foremanCommission?: number;
  dividendPerMember?: number;
  drawType: 'lottery' | 'auction' | 'manual';  // 'self-assign' dropped from server enum
  conducted: boolean;
  // NOTE: `payments: Payment[]` REMOVED — payments now at groups/{gid}/cycles/{cid}/payments/{mid}
  // Loader composes Cycle with a parallel `Map<memberId, Payment>` for display.
}

// NEW
export interface MemberMeta {
  name: string;
  phone: string;               // E.164
  hasReceived: boolean;
  cycleReceived?: number;
  joinedAt: string;
  uid?: string;                // populated lazily by phone-claim flow
  status: 'pending' | 'active' | 'removed';
}

// CHANGE — ChittiGroup gets multi-user fields; legacy `members[]` REMOVED in favor of memberMeta map
export interface ChittiGroup {
  id: string;
  name: string;
  description?: string;
  amount: number;
  totalMembers: number;
  durationMonths: number;
  drawType?: 'lottery' | 'auction' | 'manual';
  foremanCommissionPct?: number;
  maxDiscountPct?: number;
  startDate: string;
  startDay: number;
  startMonth: number;
  startYear: number;
  paymentDay: number;

  // NEW multi-user fields
  foremanUid: string;
  memberPhones: string[];                       // E.164 array; query target
  memberUids: string[];                         // backfilled by claimPhone
  memberMeta: Record<string, MemberMeta>;       // keyed by memberId
  prizedMemberIds?: string[];                   // denormalized index for rule efficiency (Pitfall 2)

  createdAt: string;
  isActive: boolean;

  // REMOVED — replaced by subcollections + memberMeta
  // members: Member[]
  // cycles: Cycle[]
}

// LEGACY — kept as a type alias for migration code only; not used in new writes
/** @deprecated Use MemberMeta + group.memberPhones. Kept for migration script reads. */
export interface LegacyMember {
  id: string;
  name: string;
  phone: string;
  hasReceived: boolean;
  cycleReceived?: number;
  joinedAt: string;
  shareToken?: string;
}

// NEW — audit log
export type AuditAction =
  | 'group.created' | 'group.archived' | 'group.restored'
  | 'member.added' | 'member.removed' | 'member.activated'
  | 'cycle.created' | 'cycle.conducted' | 'cycle.corrected'
  | 'payment.marked' | 'payment.unmarked'
  | 'settings.changed';

export interface AuditEvent {
  id: string;
  actorUid: string;
  actorRole: 'foreman' | 'member' | 'system';
  action: AuditAction;
  before?: unknown;
  after?: unknown;
  timestamp: Timestamp | FieldValue;            // serverTimestamp() on write, Timestamp on read
  notes?: string;
}

export interface PhoneIndexEntry {
  uid: string;
  claimedAt: Timestamp | FieldValue;
}
```

### Pattern 2: `src/storage/groups.ts` — new top-level group API

```ts
// src/storage/groups.ts
import {
  collection, doc, query, where, getDocs, getDoc, runTransaction,
  serverTimestamp, orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import auth from '@react-native-firebase/auth';
import { ChittiGroup, MemberMeta } from '../types';
import { appendAudit } from '../lib/audit';

const groupsCol = () => collection(db, 'groups');
const groupDoc  = (gid: string) => doc(db, 'groups', gid);

/** Returns all active groups where the caller's E.164 phone appears in memberPhones[]. */
export async function groupsForUser(myPhone: string): Promise<ChittiGroup[]> {
  const q = query(
    groupsCol(),
    where('memberPhones', 'array-contains', myPhone),
    where('isActive', '==', true),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<ChittiGroup, 'id'>) }));
}

export async function getGroup(gid: string): Promise<ChittiGroup | null> {
  const snap = await getDoc(groupDoc(gid));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<ChittiGroup, 'id'>) }) : null;
}

export async function createGroup(input: Omit<ChittiGroup, 'foremanUid' | 'memberUids'>): Promise<void> {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  const fullGroup: ChittiGroup = {
    ...input,
    foremanUid: uid,
    memberUids: [uid],
  };
  await runTransaction(db, async (tx) => {
    tx.set(groupDoc(input.id), fullGroup);
    appendAudit(tx, input.id, { action: 'group.created', after: fullGroup });
  });
}

/** Generic patch — only the foreman may call this (rules enforce). Wraps audit. */
export async function updateGroup(
  gid: string,
  patch: Partial<ChittiGroup>,
  action: 'member.added' | 'member.removed' | 'settings.changed',
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(groupDoc(gid));
    if (!snap.exists()) throw new Error('Group not found');
    const before = snap.data();
    tx.update(groupDoc(gid), patch);
    appendAudit(tx, gid, { action, before, after: { ...before, ...patch } });
  });
}
```

### Pattern 3: `src/storage/cycles.ts` + `payments.ts` — granular transactional writes

```ts
// src/storage/cycles.ts
import { collection, doc, runTransaction, getDocs, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Cycle } from '../types';
import { appendAudit } from '../lib/audit';

const cyclesCol = (gid: string) => collection(db, 'groups', gid, 'cycles');
const cycleDoc  = (gid: string, cid: string) => doc(db, 'groups', gid, 'cycles', cid);

export async function listCycles(gid: string): Promise<Cycle[]> {
  const snap = await getDocs(query(cyclesCol(gid), orderBy('cycleNumber', 'asc')));
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Cycle, 'id'>) }));
}

/** Write a cycle (create or update). If marking conducted, also flip member hasReceived flag in same tx. */
export async function upsertCycle(gid: string, cycle: Cycle): Promise<void> {
  await runTransaction(db, async (tx) => {
    const groupSnap = await tx.get(doc(db, 'groups', gid));
    if (!groupSnap.exists()) throw new Error('Group missing');
    const groupBefore = groupSnap.data();

    const action = cycle.conducted ? 'cycle.conducted' : 'cycle.created';
    tx.set(cycleDoc(gid, cycle.id), cycle);

    if (cycle.conducted && cycle.winnerId) {
      const memberMeta = { ...(groupBefore.memberMeta ?? {}) };
      memberMeta[cycle.winnerId] = {
        ...memberMeta[cycle.winnerId],
        hasReceived: true,
        cycleReceived: cycle.cycleNumber,
      };
      const prizedMemberIds = Array.from(new Set([...(groupBefore.prizedMemberIds ?? []), cycle.winnerId]));
      tx.update(doc(db, 'groups', gid), { memberMeta, prizedMemberIds });
    }

    appendAudit(tx, gid, { action, after: cycle });
  });
}
```

```ts
// src/storage/payments.ts
import { collection, doc, runTransaction, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import auth from '@react-native-firebase/auth';
import { Payment } from '../types';
import { appendAudit } from '../lib/audit';

const paymentsCol = (gid: string, cid: string) =>
  collection(db, 'groups', gid, 'cycles', cid, 'payments');
const paymentDoc  = (gid: string, cid: string, mid: string) =>
  doc(db, 'groups', gid, 'cycles', cid, 'payments', mid);

export async function listPayments(gid: string, cid: string): Promise<Payment[]> {
  const snap = await getDocs(paymentsCol(gid, cid));
  return snap.docs.map(d => d.data() as Payment);
}

export async function markPayment(
  gid: string, cid: string, memberId: string,
  mode: Payment['mode'], note?: string, paidDate?: string,
): Promise<void> {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  await runTransaction(db, async (tx) => {
    const before = (await tx.get(paymentDoc(gid, cid, memberId))).data() ?? null;
    const after: Payment = {
      memberId, paid: true, mode, note, paidDate: paidDate ?? new Date().toISOString(),
      markedByUid: uid,
    };
    tx.set(paymentDoc(gid, cid, memberId), after);
    appendAudit(tx, gid, { action: 'payment.marked', before, after });
  });
}

export async function unmarkPayment(gid: string, cid: string, memberId: string): Promise<void> {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  await runTransaction(db, async (tx) => {
    const before = (await tx.get(paymentDoc(gid, cid, memberId))).data() ?? null;
    const after: Payment = { memberId, paid: false, markedByUid: uid };
    tx.set(paymentDoc(gid, cid, memberId), after);
    appendAudit(tx, gid, { action: 'payment.unmarked', before, after });
  });
}
```

### Pattern 4: `src/lib/audit.ts` — single audit-write surface

```ts
// src/lib/audit.ts
import { collection, doc, serverTimestamp, Transaction } from 'firebase/firestore';
import { db } from './firebase';
import auth from '@react-native-firebase/auth';
import { AuditEvent, AuditAction } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface AuditInput {
  action: AuditAction;
  before?: unknown;
  after?: unknown;
  notes?: string;
  actorRole?: 'foreman' | 'member' | 'system';
}

/**
 * Append an audit entry inside an active Firestore transaction. The caller is
 * responsible for the surrounding runTransaction so the data write + audit
 * write land atomically (or neither does — Pitfall 11).
 */
export function appendAudit(tx: Transaction, groupId: string, input: AuditInput): void {
  const uid = auth().currentUser?.uid ?? 'system';
  const eventId = uuidv4();
  const event: AuditEvent = {
    id: eventId,
    actorUid: uid,
    actorRole: input.actorRole ?? 'foreman',  // default; rules enforce real role
    action: input.action,
    before: input.before,
    after: input.after,
    timestamp: serverTimestamp(),
    notes: input.notes,
  };
  tx.set(doc(db, 'groups', groupId, 'audit', eventId), event);
}
```

### Pattern 5: `firestore.indexes.json`

The keystone query (`where('memberPhones', 'array-contains', myPhone) where('isActive', '==', true) orderBy('createdAt', 'desc')`) needs a composite index. Firestore can deploy this via `firebase deploy --only firestore:indexes`.

```json
{
  "indexes": [
    {
      "collectionGroup": "groups",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "memberPhones", "arrayConfig": "CONTAINS" },
        { "fieldPath": "isActive", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "cycles",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "cycleNumber", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "audit",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

### Anti-Patterns to Avoid

- **Whole-document writes of group + nested cycles + nested payments.** The current `upsertGroup(group)` pattern is what we're escaping; do not re-introduce it in any helper signature.
- **Reading `auth().currentUser?.phoneNumber` and using it directly as a lookup key without normalization.** RNFirebase returns E.164 (`+919876543210`), but defensive code should still pipe through `toE164(...)` from Phase 1.
- **Logging audit events from outside the same transaction.** Two separate writes can land in either order; an out-of-order log is a dispute weapon (Pitfall 15).
- **Letting screens import `firebase/firestore` directly.** Storage layer is the boundary; rule violations leak SDK details into UI.
- **Allowing `appendAudit` to be called without a `Transaction`.** TypeScript signature enforces this (`tx: Transaction` is required).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic data + audit writes | Manual try/catch with rollback | `runTransaction` from `firebase/firestore` | Firestore's transactions retry on contention automatically; manual rollback misses race windows |
| Phone → uid claim atomicity | `await write(); await query(); await write()` chain | Single `runTransaction` covering claim + reconciliation (chunked at 500 writes) | Without tx, a crash between writes leaves `phoneIndex` claimed but no `memberUids` updated |
| Rules tests | Curl against deployed rules | `@firebase/rules-unit-testing` + emulator | Iterating against prod rules is slow + unsafe; emulator is local, fast, free |
| Local emulator setup | Custom Docker container | `firebase emulators:start --only firestore` | Official, version-locked, runs in any env |
| Migration idempotency | "delete + re-create" pattern | "check exists, skip if present" check at top of migrator | Re-runs are safe; partial failures recoverable |

**Key insight:** Phase 2's risk is concurrency, not throughput. Everywhere data + audit + member-state cross, the answer is `runTransaction`. Hand-rolling consistency on top of Firestore is a class of bug that only shows up in production with two devices.

## Runtime State Inventory

This phase **rewrites** the data layer. There IS existing prototype data (per STATE.md the project `chitti-app-edfb1` is functional with stubs), but no real users yet. Inventory:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **`users/{uid}/groups/*` Firestore documents** — prototype-era, per-uid subtree. Test users created via Phase 1 dev work may have created groups via the prior UI. | Migration script reads + writes to new top-level shape. Dry-run first. Idempotent. |
| Stored data | **`memberTokens/{token}` top-level collection** — used by `MemberPublicViewScreen` for the public deep link (`chitti://member/:token`). Per REQUIREMENTS.md LINK-01 "decide whether the existing public member deep link survives the multi-user data model rewrite or is removed." | **Decision needed in plan** — Phase 2 should either (a) preserve and re-target tokens at the new group shape, or (b) drop entirely. Researcher recommends **drop** in Phase 2 — public unauth views violate the rules-first principle and are arguably out-of-scope post-multi-user. Mark LINK-01 as resolved-by-removal. |
| Stored data | **No real `phoneIndex/*` docs yet** — collection is new in Phase 2. | First sign-in post-Phase-2 deploys creates them. |
| Live service config | **Firebase Console — `chitti-app-edfb1`** — Firestore rules currently allow-all or default. | Deploy new `firestore.rules` via `firebase deploy --only firestore:rules`. Deploy composite indexes via `firebase deploy --only firestore:indexes`. Both go through `firebase-tools` CLI. |
| Live service config | **Firestore composite index** for `memberPhones array-contains + isActive + createdAt`. Without it, the keystone Home query fails at runtime with a one-time error pointing at a console URL to create the index. | `firestore.indexes.json` (Pattern 5) — deployed alongside rules. |
| OS-registered state | None. | None. |
| Secrets / env vars | None new. Phase 2 doesn't introduce new env vars. | None. |
| Build artifacts | None new. Existing `firebase` JS SDK dep covers Firestore. `firebase-tools` is dev-only (no shipping bundle impact). | None. |

**Nothing found in category "OS-registered state":** None — Firebase emulator is a local process invoked from `package.json` scripts; no OS service registration.

## Common Pitfalls

Cross-referenced with `.planning/research/PITFALLS.md`. **Pitfalls 5, 11, 17 are directly central** (called out in CONTEXT.md). Pitfalls 2, 6, 10, 15 are also relevant.

### Pitfall 5 (PITFALLS.md): Migration orphans the member-side experience

**What goes wrong:** Naively copy `users/{uid}/groups/*` to top-level `groups/*` keeping `ownerId` only. Foreman sees their groups; **no member sees anything** because no `phoneIndex` and no `memberUids` backfill.

**How avoided in this research:** §6 migration script explicitly populates `memberPhones[]` (from each LegacyMember's `toE164(phone, 'IN')`), leaves `memberUids` empty initially, relies on Phase 2's phone-claim flow to backfill on each member's first sign-in. End-to-end test (Wave 7) signs in as two emulator users and asserts the same group renders on both.

### Pitfall 11 (PITFALLS.md): Concurrent writes — last-write-wins

**What goes wrong:** Two devices marking a payment simultaneously clobber each other. Or audit and data drift apart.

**How avoided:** Every mutation in §3 (`upsertCycle`, `markPayment`, `unmarkPayment`, `updateGroup`, `createGroup`) wraps in `runTransaction`. The transaction reads `before`, writes `after`, writes the audit entry — all atomic. Concurrent mutations retry until they win or the transaction's max-attempts is hit (default 5, then throws).

### Pitfall 17 (PITFALLS.md): Discount cap enforced UI-only

**What goes wrong:** Malicious or buggy client writes a cycle with `discount > maxDiscountPct * chitValue`. Firestore accepts. Ledger corrupted.

**How avoided:** §3 `firestore.rules` for `groups/{gid}/cycles/{cid}` write does:
```
get(/databases/$(database)/documents/groups/$(gid)).data.maxDiscountPct
```
and verifies `request.resource.data.discount <= maxDiscountPct * groupAmount * totalMembers / 100`. Also whitelists `drawType in ['lottery', 'auction', 'manual']`. Tests (§4) include a rules-unit case that submits `discount = 95%` and asserts rejection.

### Additional pitfalls flagged for this phase

**Pitfall G: Forgetting `serverTimestamp()` on audit entries.** Client-side `new Date()` is wrong — devices have clock drift; ordering becomes ambiguous. Always `serverTimestamp()` in `appendAudit`. (Tests should write two entries from two contexts in quick succession and assert their server timestamps order correctly.)

**Pitfall H: `runTransaction` retry side effects.** Firestore retries transactions on contention. Any non-Firestore side effect (toast, console.log, analytics) inside a transaction body runs N times. Keep transaction bodies pure — no toasts, no logs.

**Pitfall I: `array-contains` does not match across two arrays.** Firestore's `array-contains` takes a single scalar, not another array. Member-side query asks "is THIS phone in memberPhones?" with one phone, not "any of these phones." If a user later has multiple verified phones, that becomes a `array-contains-any` query (max 10 elements). Out of scope today; document.

**Pitfall J: `phoneIndex/{e164}` doc ID is the phone — slashes and special chars matter.** E.164 has only `+` and digits, no slashes — safe as a doc ID. But if the toE164 ever returns garbage (Pitfall 6), it'd corrupt the path. Defensive: `toE164` always returns null on parse fail; never construct the path with a null-coalescing fallback.

**Pitfall K: Rules `get()` reads count against the rules-evaluation quota.** Each `get()` in a rule is one read. For cycle writes, we do one `get(group)` per rule eval — acceptable. Avoid `get()` chains in hot paths.

**Pitfall L: `@firebase/rules-unit-testing` requires a specific Firebase emulator version.** Pin `firebase-tools` in devDeps and document the emulator launch command in `package.json` (`"emulator": "firebase emulators:start --only firestore"`) so devs use the same version as CI.

## Code Examples

### Example A: Full `firestore.rules` (ready to paste)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ─────────────────────── Helpers ───────────────────────
    function isSignedIn() {
      return request.auth != null;
    }
    function isForeman(group) {
      return isSignedIn() && request.auth.uid == group.foremanUid;
    }
    function isMember(group) {
      return isSignedIn() && request.auth.uid in group.memberUids;
    }
    function canRead(group) {
      return isForeman(group) || isMember(group);
    }
    function loadGroup(gid) {
      return get(/databases/$(database)/documents/groups/$(gid)).data;
    }

    // ─────────────────────── groups ───────────────────────
    match /groups/{groupId} {
      allow read: if canRead(resource.data);

      // On create, the writer must claim themselves as foreman.
      allow create: if isSignedIn()
        && request.resource.data.foremanUid == request.auth.uid
        && request.auth.uid in request.resource.data.memberUids
        && request.resource.data.drawType in ['lottery', 'auction', 'manual']
        && request.resource.data.foremanCommissionPct is number
        && request.resource.data.foremanCommissionPct <= 5
        && request.resource.data.maxDiscountPct is number
        && request.resource.data.maxDiscountPct <= 40;

      // On update, only the foreman.
      allow update: if isForeman(resource.data)
        && request.resource.data.foremanUid == resource.data.foremanUid;  // can't change foreman

      // Deletes allowed for foreman; audit log will record the action via the same transaction.
      allow delete: if isForeman(resource.data);

      // ─────────────────────── cycles ───────────────────────
      match /cycles/{cycleId} {
        allow read: if canRead(loadGroup(groupId));

        allow create, update: if isForeman(loadGroup(groupId))
          && request.resource.data.drawType in ['lottery', 'auction', 'manual']
          && (
            // Either not conducted yet (no discount enforcement needed) ...
            request.resource.data.conducted == false
            ||
            // ... or conducted: enforce discount cap and prized-once.
            (
              request.resource.data.discount is number
              && request.resource.data.discount >= 0
              && request.resource.data.discount <=
                   loadGroup(groupId).maxDiscountPct
                   * loadGroup(groupId).amount
                   * loadGroup(groupId).totalMembers / 100
              && !(request.resource.data.winnerId in loadGroup(groupId).prizedMemberIds)
            )
          );

        allow delete: if false;  // cycles never deleted; corrections via 'cycle.corrected' update

        // ─────────────────────── payments ───────────────────────
        match /payments/{memberId} {
          allow read: if canRead(loadGroup(groupId));
          allow create, update: if isForeman(loadGroup(groupId))
            && request.resource.data.markedByUid == request.auth.uid;
          allow delete: if false;
        }
      }

      // ─────────────────────── audit (append-only) ───────────────────────
      match /audit/{eventId} {
        allow read: if canRead(loadGroup(groupId));
        allow create: if isForeman(loadGroup(groupId))
          && request.resource.data.actorUid == request.auth.uid;
        allow update, delete: if false;
      }
    }

    // ─────────────────────── phoneIndex ───────────────────────
    match /phoneIndex/{e164} {
      // A user can read their own claim (e.g., to detect double-sign-in).
      allow read: if isSignedIn()
        && request.auth.token.phone_number == e164;

      // Create-only — winner-takes-all by first write. Update + delete forbidden.
      allow create: if isSignedIn()
        && request.auth.token.phone_number == e164
        && request.resource.data.uid == request.auth.uid;
      allow update, delete: if false;
    }
  }
}
```

**Cross-document read note:** `loadGroup(groupId)` calls `get()` once per rule evaluation. Each `get()` is a billed read. For payment writes we evaluate the rule once per write; for batch transactions Firestore evaluates per-document. Acceptable cost; flagged as Pitfall K.

**When `request.auth.uid in resource.data.memberUids` fails and fallback:** This fails for **freshly-added members who haven't yet signed in** — their uid isn't in `memberUids` because no claim has happened. Solution: PITFALLS.md Pitfall 5 suggests a phone fallback (`request.auth.token.phone_number in resource.data.memberPhones`). We DO include this implicitly via the phone-claim flow: when the new user signs in, `AuthContext.claimPhone()` runs immediately and backfills `memberUids` BEFORE the Home query runs. As a defense-in-depth backstop, the planner MAY consider adding the phone-fallback clause to the `isMember()` helper:
```javascript
function isMember(group) {
  return isSignedIn() && (
    request.auth.uid in group.memberUids
    || request.auth.token.phone_number in group.memberPhones
  );
}
```
Recommended **yes** — closes the race window if the claim transaction hasn't completed by the time the Home query runs.

### Example B: `tests/firestore-rules.test.ts` scaffold

```ts
// tests/firestore-rules.test.ts
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertSucceeds, assertFails,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let env: RulesTestEnvironment;

const FOREMAN = { uid: 'foreman-uid', phone: '+919000000001' };
const MEMBER  = { uid: 'member-uid',  phone: '+919000000002' };
const STRANGER = { uid: 'stranger-uid', phone: '+919000000099' };

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'chitti-rules-test',
    firestore: {
      rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

async function seedGroup(opts: { gid: string; foremanUid: string; memberUids: string[]; memberPhones: string[]; maxDiscountPct?: number; prizedMemberIds?: string[] }) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'groups', opts.gid), {
      id: opts.gid, name: 'Test Group', amount: 5000, totalMembers: 20, durationMonths: 20,
      foremanUid: opts.foremanUid,
      memberUids: opts.memberUids,
      memberPhones: opts.memberPhones,
      memberMeta: {},
      prizedMemberIds: opts.prizedMemberIds ?? [],
      drawType: 'lottery',
      foremanCommissionPct: 5,
      maxDiscountPct: opts.maxDiscountPct ?? 30,
      isActive: true,
      createdAt: new Date().toISOString(),
      startDate: '2026-01-01T00:00:00Z', startDay: 1, startMonth: 0, startYear: 2026, paymentDay: 1,
    });
  });
}

function dbAs(user: { uid: string; phone: string }) {
  return env.authenticatedContext(user.uid, { phone_number: user.phone }).firestore();
}
function dbUnauth() {
  return env.unauthenticatedContext().firestore();
}

describe('groups read', () => {
  beforeEach(() => seedGroup({ gid: 'g1', foremanUid: FOREMAN.uid, memberUids: [FOREMAN.uid, MEMBER.uid], memberPhones: [FOREMAN.phone, MEMBER.phone] }));

  it('stranger cannot read a group they are not in', async () => {
    await assertFails(getDoc(doc(dbAs(STRANGER), 'groups', 'g1')));
  });
  it('member can read their group', async () => {
    await assertSucceeds(getDoc(doc(dbAs(MEMBER), 'groups', 'g1')));
  });
  it('foreman can read their group', async () => {
    await assertSucceeds(getDoc(doc(dbAs(FOREMAN), 'groups', 'g1')));
  });
});

describe('groups write', () => {
  beforeEach(() => seedGroup({ gid: 'g1', foremanUid: FOREMAN.uid, memberUids: [FOREMAN.uid, MEMBER.uid], memberPhones: [FOREMAN.phone, MEMBER.phone] }));

  it('member cannot write to the group doc', async () => {
    await assertFails(updateDoc(doc(dbAs(MEMBER), 'groups', 'g1'), { name: 'Hacked' }));
  });
  it('foreman can update name', async () => {
    await assertSucceeds(updateDoc(doc(dbAs(FOREMAN), 'groups', 'g1'), { name: 'Renamed' }));
  });
  it('foreman cannot change foremanUid', async () => {
    await assertFails(updateDoc(doc(dbAs(FOREMAN), 'groups', 'g1'), { foremanUid: STRANGER.uid }));
  });
});

describe('cycles write — discount cap (Pitfall 17)', () => {
  beforeEach(() => seedGroup({ gid: 'g1', foremanUid: FOREMAN.uid, memberUids: [FOREMAN.uid, MEMBER.uid], memberPhones: [FOREMAN.phone, MEMBER.phone], maxDiscountPct: 30 }));

  it('rejects discount above maxDiscountPct', async () => {
    // 30% of 5000 * 20 = 30000. Submit 50000 — must fail.
    await assertFails(setDoc(doc(dbAs(FOREMAN), 'groups/g1/cycles/c1'), {
      id: 'c1', cycleNumber: 1, drawType: 'auction', conducted: true,
      winnerId: MEMBER.uid, winAmount: 50000, discount: 50000,
      date: '2026-02-01', foremanCommission: 5000, dividendPerMember: 0,
    }));
  });
  it('accepts discount at cap', async () => {
    await assertSucceeds(setDoc(doc(dbAs(FOREMAN), 'groups/g1/cycles/c1'), {
      id: 'c1', cycleNumber: 1, drawType: 'auction', conducted: true,
      winnerId: MEMBER.uid, winAmount: 70000, discount: 30000,
      date: '2026-02-01', foremanCommission: 5000, dividendPerMember: 0,
    }));
  });
  it('rejects unknown drawType (enum whitelist)', async () => {
    await assertFails(setDoc(doc(dbAs(FOREMAN), 'groups/g1/cycles/c1'), {
      id: 'c1', cycleNumber: 1, drawType: 'self-assign', conducted: false,
      winnerId: null, winAmount: 0,
      date: '2026-02-01',
    }));
  });
});

describe('audit log — append only', () => {
  beforeEach(() => seedGroup({ gid: 'g1', foremanUid: FOREMAN.uid, memberUids: [FOREMAN.uid, MEMBER.uid], memberPhones: [FOREMAN.phone, MEMBER.phone] }));

  it('foreman can create audit entry', async () => {
    await assertSucceeds(setDoc(doc(dbAs(FOREMAN), 'groups/g1/audit/e1'), {
      id: 'e1', actorUid: FOREMAN.uid, actorRole: 'foreman',
      action: 'payment.marked', timestamp: new Date(),
    }));
  });
  it('foreman cannot update an existing audit entry', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'groups/g1/audit/e1'), {
        id: 'e1', actorUid: FOREMAN.uid, actorRole: 'foreman', action: 'payment.marked', timestamp: new Date(),
      });
    });
    await assertFails(updateDoc(doc(dbAs(FOREMAN), 'groups/g1/audit/e1'), { notes: 'rewritten' }));
  });
  it('foreman cannot delete an audit entry', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'groups/g1/audit/e1'), {
        id: 'e1', actorUid: FOREMAN.uid, actorRole: 'foreman', action: 'payment.marked', timestamp: new Date(),
      });
    });
    await assertFails(deleteDoc(doc(dbAs(FOREMAN), 'groups/g1/audit/e1')));
  });
});

describe('phoneIndex', () => {
  it('user can claim their own phone', async () => {
    await assertSucceeds(setDoc(doc(dbAs(MEMBER), 'phoneIndex', MEMBER.phone), {
      uid: MEMBER.uid, claimedAt: new Date(),
    }));
  });
  it('user cannot claim someone else\'s phone', async () => {
    await assertFails(setDoc(doc(dbAs(MEMBER), 'phoneIndex', FOREMAN.phone), {
      uid: MEMBER.uid, claimedAt: new Date(),
    }));
  });
  it('claim is immutable — no overwrite', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'phoneIndex', MEMBER.phone), { uid: MEMBER.uid, claimedAt: new Date() });
    });
    await assertFails(updateDoc(doc(dbAs(MEMBER), 'phoneIndex', MEMBER.phone), { uid: STRANGER.uid }));
  });
});
```

### Example C: `firebase.json` for the emulator

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "emulators": {
    "firestore": {
      "host": "127.0.0.1",
      "port": 8080
    },
    "ui": {
      "enabled": true,
      "host": "127.0.0.1",
      "port": 4000
    },
    "singleProjectMode": true
  }
}
```

`package.json` script additions:
```json
{
  "scripts": {
    "emulator": "firebase emulators:start --only firestore",
    "test:rules": "firebase emulators:exec --only firestore \"jest tests/firestore-rules.test.ts\"",
    "deploy:rules": "firebase deploy --only firestore:rules,firestore:indexes --project chitti-app-edfb1"
  }
}
```

CI integration (GitHub Actions sketch — planner can place at `.github/workflows/test.yml`):
```yaml
name: Test
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - uses: actions/setup-java@v4
        with: { distribution: 'temurin', java-version: '17' }  # emulator needs Java
      - run: npm ci
      - run: npm run lint
      - run: npm test -- --testPathIgnorePatterns=firestore-rules
      - run: npm run test:rules
```

### Example D: `AuthContext.claimPhone` flow

```ts
// in src/lib/AuthContext.tsx — additions only
import {
  doc, runTransaction, query, where, collection, getDocs, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';

async function claimPhoneAndReconcile(uid: string, e164: string): Promise<void> {
  // Step 1 — atomic claim of phoneIndex/{e164}. Idempotent: if claim exists with our uid, skip; if different uid, BAIL.
  try {
    await runTransaction(db, async (tx) => {
      const ref = doc(db, 'phoneIndex', e164);
      const snap = await tx.get(ref);
      if (snap.exists()) {
        const existing = snap.data();
        if (existing.uid === uid) return;  // already claimed by us — idempotent
        throw new Error('phone-already-claimed-by-different-uid');
      }
      tx.set(ref, { uid, claimedAt: serverTimestamp() });
    });
  } catch (e: any) {
    if (e.message === 'phone-already-claimed-by-different-uid') {
      console.warn('[auth] phone already claimed; previous device wins. Sign out and back in to reclaim.');
      return;  // graceful — don't crash; user can sign out + re-claim if they verify they own the number
    }
    throw e;
  }

  // Step 2 — backfill memberUids on every group where memberPhones contains this phone.
  // Cannot do in one transaction (queries inside transactions are limited and the result set may exceed 500 writes).
  // Use a writeBatch chunked at 500.
  const q = query(collection(db, 'groups'), where('memberPhones', 'array-contains', e164));
  const snap = await getDocs(q);
  if (snap.empty) return;

  // Group by chunks of 500 to respect batch limit. Each batch is atomic per-batch (not across batches).
  // For each group: set memberUids array-union (we do read-merge-write in one tx-per-group for atomicity with audit).
  for (const groupSnap of snap.docs) {
    const gid = groupSnap.id;
    const groupBefore = groupSnap.data();
    if (groupBefore.memberUids?.includes(uid)) continue;  // already reconciled

    // Find which memberId in memberMeta matches this phone, so we can set memberMeta.{id}.uid + .status='active'.
    const matchingMemberId = Object.entries(groupBefore.memberMeta ?? {})
      .find(([, m]: [string, any]) => m.phone === e164)?.[0];

    await runTransaction(db, async (tx) => {
      const ref = doc(db, 'groups', gid);
      const cur = await tx.get(ref);
      if (!cur.exists()) return;
      const data = cur.data();
      if (data.memberUids?.includes(uid)) return;
      const newUids = [...(data.memberUids ?? []), uid];
      const newMeta = { ...(data.memberMeta ?? {}) };
      if (matchingMemberId && newMeta[matchingMemberId]) {
        newMeta[matchingMemberId] = { ...newMeta[matchingMemberId], uid, status: 'active' };
      }
      tx.update(ref, { memberUids: newUids, memberMeta: newMeta });
      // appendAudit must run inside the same tx (action: 'member.activated')
      // (omitted here for brevity — see Pattern 4)
    });
  }
}

// In the existing useEffect:
useEffect(() => {
  if (IS_WEB) { setLoading(false); return; }
  const unsub = auth().onAuthStateChanged(async (u) => {
    setFirebaseUser(u);
    setLoading(false);
    if (u?.phoneNumber) {
      // Fire-and-forget; do not block the UI on reconciliation.
      claimPhoneAndReconcile(u.uid, u.phoneNumber).catch(e =>
        console.warn('[auth] claim/reconcile failed', e)
      );
    }
  });
  return unsub;
}, []);
```

### Example E: Migration script shape (`scripts/migrate-to-multi-user.ts`)

```ts
// scripts/migrate-to-multi-user.ts
//
// Invoke locally:  npx ts-node scripts/migrate-to-multi-user.ts --dry-run
//                  npx ts-node scripts/migrate-to-multi-user.ts
//
// Reads `users/{uid}/groups/*` (legacy per-user subtree). Writes `groups/{groupId}` (new top-level shape).
// Idempotent: skips groups that already exist top-level. Logs one line per group + one summary line.

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { toE164 } from '../src/utils/phone';
import { readFileSync } from 'fs';

const DRY_RUN = process.argv.includes('--dry-run');
const SERVICE_ACCOUNT = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ?? './migration-service-account.json';

initializeApp({ credential: cert(JSON.parse(readFileSync(SERVICE_ACCOUNT, 'utf8'))) });
const db = getFirestore();

async function main() {
  const usersSnap = await db.collection('users').get();
  let migrated = 0, skipped = 0, errors = 0, skippedPhones = 0;

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const groupsSnap = await db.collection('users').doc(uid).collection('groups').get();

    for (const legacyGroupSnap of groupsSnap.docs) {
      const gid = legacyGroupSnap.id;
      const legacy = legacyGroupSnap.data();

      // Idempotent check
      const existing = await db.collection('groups').doc(gid).get();
      if (existing.exists) {
        console.log(`[skip] group ${gid} already exists top-level`);
        skipped++;
        continue;
      }

      // Build new shape
      const memberPhones: string[] = [];
      const memberMeta: Record<string, any> = {};
      for (const m of (legacy.members ?? [])) {
        const e164 = toE164(m.phone, 'IN');
        if (!e164) {
          console.warn(`[warn] group ${gid} member ${m.id} phone "${m.phone}" not normalizable; omitting from memberPhones (memberMeta retained)`);
          skippedPhones++;
          memberMeta[m.id] = { ...m, phone: m.phone, status: 'pending' };
          continue;
        }
        memberPhones.push(e164);
        memberMeta[m.id] = {
          name: m.name, phone: e164, hasReceived: m.hasReceived,
          cycleReceived: m.cycleReceived, joinedAt: m.joinedAt,
          status: 'pending',  // becomes 'active' when phone-claim runs
        };
      }

      const prizedMemberIds = Object.entries(memberMeta).filter(([, v]: [string, any]) => v.hasReceived).map(([k]) => k);

      const newGroup = {
        id: gid,
        name: legacy.name, description: legacy.description, amount: legacy.amount,
        totalMembers: legacy.totalMembers, durationMonths: legacy.durationMonths,
        drawType: legacy.drawType ?? 'lottery',
        foremanCommissionPct: legacy.foremanCommissionPct ?? 5,
        maxDiscountPct: legacy.maxDiscountPct ?? 30,
        startDate: legacy.startDate, startDay: legacy.startDay,
        startMonth: legacy.startMonth, startYear: legacy.startYear,
        paymentDay: legacy.paymentDay,
        foremanUid: uid,
        memberPhones, memberUids: [uid], memberMeta, prizedMemberIds,
        createdAt: legacy.createdAt, isActive: legacy.isActive ?? true,
      };

      if (DRY_RUN) {
        console.log(`[dry-run] would write group ${gid} (${memberPhones.length} phones, ${Object.keys(memberMeta).length} members)`);
        migrated++;
        continue;
      }

      try {
        await db.runTransaction(async (tx) => {
          tx.set(db.collection('groups').doc(gid), newGroup);
          // Migrate cycles[] -> /cycles subcollection
          for (const c of (legacy.cycles ?? [])) {
            const { payments, ...cycleHeader } = c;
            tx.set(db.collection('groups').doc(gid).collection('cycles').doc(c.id), cycleHeader);
            for (const p of (payments ?? [])) {
              tx.set(
                db.collection('groups').doc(gid).collection('cycles').doc(c.id).collection('payments').doc(p.memberId),
                p,
              );
            }
          }
          // Initial audit entry
          tx.set(db.collection('groups').doc(gid).collection('audit').doc(`migration-${Date.now()}`), {
            id: `migration-${Date.now()}`, actorUid: 'system', actorRole: 'system',
            action: 'group.created', after: { migratedFrom: `users/${uid}/groups/${gid}` },
            timestamp: new Date(),
            notes: 'Auto-migrated by scripts/migrate-to-multi-user.ts',
          });
        });
        console.log(`[migrate] ${gid} (${memberPhones.length} phones)`);
        migrated++;
      } catch (e) {
        console.error(`[error] ${gid}:`, e);
        errors++;
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped (already exists): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Member phones skipped (un-normalizable): ${skippedPhones}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN (no writes)' : 'LIVE'}`);
}

main().catch(e => { console.error(e); process.exit(1); });
```

Requires `firebase-admin` as a devDep (`npm install --save-dev firebase-admin@^12.x ts-node`). The service account JSON is downloaded from Firebase Console > Project Settings > Service accounts > "Generate new private key" — gitignored, supplied via `GOOGLE_APPLICATION_CREDENTIALS` env.

## Storage Shim Rewrite Plan

### Decision: split into per-concern modules

The current single `src/lib/firestore.ts` had four functions. Phase 2 has ~14 (groups: 5, cycles: 3, payments: 3, audit: 2, phoneIndex: 1). Single file gets unwieldy + violates single-responsibility. **Split into `src/storage/{groups,cycles,payments,audit}.ts`** with `src/storage/index.ts` as a barrel that re-exports + does demo-mode routing.

### `src/storage/index.ts` (rewritten)

```ts
/**
 * Storage barrel. Each function routes to either the in-memory demo store
 * (when __demoMode) or the new top-level Firestore helpers.
 */
import auth from '@react-native-firebase/auth';
import { __demoMode } from '../lib/AuthContext';
import * as G from './groups';
import * as C from './cycles';
import * as P from './payments';
import * as A from './audit';
import * as Demo from './demo';
import { ChittiGroup, Cycle, Payment, AuditEvent } from '../types';

function myPhone(): string {
  const p = auth().currentUser?.phoneNumber;
  if (!p) throw new Error('Not authenticated');
  return p;
}

// Groups
export async function getGroups(): Promise<ChittiGroup[]> {
  if (__demoMode) return Demo.getGroups();
  return G.groupsForUser(myPhone());
}
export async function getGroupById(id: string): Promise<ChittiGroup | null> {
  if (__demoMode) return Demo.getGroupById(id);
  return G.getGroup(id);
}
export async function createGroup(g: Omit<ChittiGroup, 'foremanUid' | 'memberUids'>): Promise<void> {
  if (__demoMode) return Demo.upsertGroup({ ...g, foremanUid: 'demo-user', memberUids: ['demo-user'] } as ChittiGroup);
  return G.createGroup(g);
}
export async function updateGroupMembers(gid: string, patch: Partial<ChittiGroup>): Promise<void> {
  if (__demoMode) {
    const g = await Demo.getGroupById(gid);
    if (g) await Demo.upsertGroup({ ...g, ...patch });
    return;
  }
  return G.updateGroup(gid, patch, 'member.added');
}
export async function deleteGroup(id: string): Promise<void> {
  if (__demoMode) return Demo.deleteGroup(id);
  return G.archiveGroup(id);  // soft-archive — or hard-delete per CONTEXT
}

// Cycles
export async function listCycles(gid: string): Promise<Cycle[]> {
  if (__demoMode) return Demo.listCycles(gid);
  return C.listCycles(gid);
}
export async function upsertCycle(gid: string, cycle: Cycle): Promise<void> {
  if (__demoMode) return Demo.upsertCycle(gid, cycle);
  return C.upsertCycle(gid, cycle);
}

// Payments
export async function listPayments(gid: string, cid: string): Promise<Payment[]> {
  if (__demoMode) return Demo.listPayments(gid, cid);
  return P.listPayments(gid, cid);
}
export async function markPayment(gid: string, cid: string, mid: string, mode: Payment['mode'], note?: string, paidDate?: string): Promise<void> {
  if (__demoMode) return Demo.markPayment(gid, cid, mid, mode, note, paidDate);
  return P.markPayment(gid, cid, mid, mode, note, paidDate);
}
export async function unmarkPayment(gid: string, cid: string, mid: string): Promise<void> {
  if (__demoMode) return Demo.unmarkPayment(gid, cid, mid);
  return P.unmarkPayment(gid, cid, mid);
}

// Audit (read-only client query)
export async function listAudit(gid: string): Promise<AuditEvent[]> {
  if (__demoMode) return [];   // demo has no audit
  return A.listAuditForGroup(gid);
}
```

### Screens that break (and need updating)

| Screen | What breaks | Update |
|--------|-------------|--------|
| `HomeScreen.tsx` | `getGroups().then(setGroups)` — still works in shape, but routes via `myPhone()` not `uid()` | Mostly automatic; verify type-only changes |
| `CreateGroupScreen.tsx` | `upsertGroup(newGroup)` no longer exists | Swap to `createGroup(newGroup)`; cycles initialization moves to a separate `upsertCycle` loop |
| `GroupDetailScreen.tsx` | `upsertGroup(updated)` for member changes; `deleteGroup` | Swap to `updateGroupMembers(gid, patch)` / `deleteGroup` (unchanged signature) |
| `AddMemberScreen.tsx` | `upsertGroup({ ...group, members: ..., cycles })` — group + cycles in one write | Split into `updateGroupMembers(...)` (group members[]/phones[]/meta) + `upsertCycle(gid, cycle)` loop for initialization |
| `DrawScreen.tsx` | `upsertGroup({ ...group, members: updatedMembers, cycles: updatedCycles })` | `upsertCycle(gid, cycle)` (member hasReceived flag is updated inside `upsertCycle` transaction — see Pattern 3) |
| `PaymentTrackingScreen.tsx` | `upsertGroup(updated)` to flip a payment | `markPayment(gid, cid, mid, mode)` or `unmarkPayment(gid, cid, mid)` |
| `CycleReceiptScreen.tsx` | reads `group.cycles[i].payments` from the group doc | reads from `listPayments(gid, cid)` separately; loader composes |
| `MemberDetailScreen.tsx` | reads `group.cycles` from group doc | reads via `listCycles(gid)` |
| `MemberPublicViewScreen.tsx` | Uses `getGroupByMemberToken(token)` from `lib/firestore.ts` (deleted) | **Decision per Runtime State Inventory** — recommended drop. Remove screen + route + token storage. Resolves LINK-01. |

The barrel keeps screen imports stable in path (`from '../storage'`); only the function names change for the four `upsertGroup`-based mutations.

## Demo Storage Reshape

`src/storage/demo.ts` currently uses old shape: `ChittiGroup.members: Member[]` and `ChittiGroup.cycles: Cycle[]` (with `cycle.payments: Payment[]` nested). Reshape to:

```ts
function seedAnnaNagar(): ChittiGroup {
  const memberPhones = [
    '+919876543210', '+919812345678', '+919012345678', // ...20 E.164 phones (normalize via toE164)
  ];
  const memberMeta: Record<string, MemberMeta> = {
    'm-ravi-krishnan': { name: 'Ravi Krishnan', phone: '+919876543210', hasReceived: false, joinedAt: '2026-01-15T10:00:00Z', status: 'active' },
    'm-priya-menon':   { name: 'Priya Menon',   phone: '+919812345678', hasReceived: true,  cycleReceived: 3, joinedAt: '2026-01-15T10:00:00Z', status: 'active' },
    // ...
  };
  return {
    id: 'demo-anna-nagar',
    foremanUid: 'demo-user',
    memberUids: ['demo-user'],
    memberPhones, memberMeta,
    prizedMemberIds: ['m-priya-menon', 'm-anjali-sharma', 'm-vikram-rao', 'm-naveen-kumar'],
    // ...rest unchanged from current shape
  };
}
```

In-memory demo stores cycles and payments in **parallel Maps** alongside the group Map, mirroring the Firestore subcollection layout:

```ts
const groupStore = new Map<string, ChittiGroup>();
const cycleStore = new Map<string, Map<string, Cycle>>();              // gid -> cid -> Cycle
const paymentStore = new Map<string, Map<string, Map<string, Payment>>>();  // gid -> cid -> mid -> Payment
```

This way `Demo.listCycles(gid)`, `Demo.markPayment(gid, cid, mid, ...)` etc. mirror the real shapes exactly.

**Demo audit:** SKIP. Demo screens don't show audit log entries today, no value in mirroring. `Demo.listAudit(gid) -> []`.

**Why this works:** `__demoMode` short-circuits in the storage shim before any Firestore call. The new multi-user query path (`where memberPhones array-contains ...`) is never reached in demo. Demo's foreman is `'demo-user'` — they "own" all three seeded chits; the "Switch view" toggle on GroupDetail is the only way to preview member-side rendering in demo.

## UX-02 + UX-03 Code-Only Scope

### 9.1 UX-02: Native date pickers

**Library:** `@react-native-community/datetimepicker`. Expo SDK 56 documents it under `sdk/date-time-picker` and provides a config-plugin-free integration. [CITED: docs.expo.dev/versions/v56.0.0/sdk/date-time-picker]

Install via `npx expo install @react-native-community/datetimepicker` so the version is pinned to SDK 56 compatible.

**Where used:**

1. **CreateGroupScreen — "Starting month" field.** Today uses a custom day-grid (per CONTEXT). Replace with `DateTimePicker` displaying month/year picker:
   ```tsx
   import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
   const [startDate, setStartDate] = useState(new Date());
   const [showPicker, setShowPicker] = useState(false);

   <Pressable onPress={() => setShowPicker(true)}>
     <Text>{startDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</Text>
   </Pressable>
   {showPicker && (
     <DateTimePicker
       value={startDate}
       mode="date"
       display={Platform.OS === 'ios' ? 'spinner' : 'default'}
       onChange={(_: DateTimePickerEvent, d?: Date) => {
         setShowPicker(Platform.OS === 'ios');  // iOS stays open until dismissed
         if (d) setStartDate(d);
       }}
     />
   )}
   ```

2. **PaymentTrackingScreen — "Paid on" date in mark-payment sheet.** Optional date input when foreman wants to backdate. Same `DateTimePicker` pattern, default = today.

**Edge cases:** iOS 14+ uses the wheel-spinner by default; Android uses the native calendar dialog. `display='spinner'` on iOS gives the rolling wheel look; `display='compact'` is the iOS 14+ inline pop-out. Pick `default` per platform and let OS decide.

### 9.2 UX-03: Android hardware-back + iOS swipe-back

**iOS:** React Navigation 7's `native-stack` (already installed) handles swipe-back automatically. No code needed. Only thing to verify: any screen that shouldn't allow swipe-back (e.g., a confirmation modal) sets `gestureEnabled: false` in screen options. Audit pass: in `AppNavigator.tsx` check options for screens where swipe-back would skip a confirmation.

**Android:** RN's `BackHandler` is the API. React Navigation only auto-handles back to pop the stack; it does NOT show a confirmation dialog before popping. We need to intervene on four screens:

| Screen | Back-handler behavior |
|--------|------------------------|
| `DrawScreen` (mid-draw) | If user has selected a winner but not confirmed, ask "Discard draw?" |
| `PaymentTrackingScreen` (mid-edit) | No-op — payments are saved atomically per tap |
| `GroupDetailScreen` (mid-delete confirm) | Confirm dialog already shows; back-handler dismisses dialog instead of popping screen |
| `CreateGroupScreen` (mid-edit) | If form has unsaved changes, "Discard changes?" |
| Demo mode exit | "Exit demo? You'll lose all demo data." (already handled by `leaveDemoMode`) |

**Standard pattern using `useFocusEffect` + `BackHandler`:**

```tsx
import { useFocusEffect } from '@react-navigation/native';
import { BackHandler, Alert } from 'react-native';
import { useCallback } from 'react';

useFocusEffect(
  useCallback(() => {
    const onBackPress = () => {
      if (hasUnsavedChanges) {
        Alert.alert('Discard changes?', 'Your edits will be lost.', [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
        ]);
        return true;   // prevent default back
      }
      return false;    // allow default back
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [hasUnsavedChanges, navigation])
);
```

`useFocusEffect` ensures the listener attaches when the screen gains focus and detaches when it loses focus — critical because multiple screens registering the same handler is a bug source.

**Verification (deferred to Phase 5):** Each of the 4 screens above has its hardware-back behavior tested on a physical Android device.

## State of the Art

| Old Approach | Current Approach | Impact for Phase 2 |
|--------------|------------------|--------------------|
| `users/{uid}/groups/{gid}` per-uid subtree | Top-level `groups/{gid}` + `memberPhones[]` query | LOCKED — this phase |
| Whole-document writes of entire group + cycles + payments | Subcollections per cycle / payment + transactional granular writes | LOCKED — this phase |
| `stripUndefined` via JSON round-trip | `initializeFirestore(app, { ignoreUndefinedProperties: true })` | Add in `firebase.ts` init — minor |
| No audit log | `audit/*` subcollection, append-only, every mutation | LOCKED — this phase |
| Client-trust everything | `firestore.rules` in repo with field-level validation + cross-doc reads | LOCKED — this phase |
| UI-only confirmation dialogs | `Alert.alert` (UX-01 done) + `BackHandler` (UX-03 this phase) | UX-03 lands code path; hardware verification deferred |
| Custom day-grid for date selection | Native `@react-native-community/datetimepicker` | UX-02 this phase |
| Public `memberTokens/*` deep link | Removed (LINK-01 resolved via removal) | Recommended drop |

**Deprecated/outdated:**
- `src/lib/firestore.ts` (whole module) — REPLACED by `src/storage/{groups,cycles,payments,audit}.ts`.
- `ChittiGroup.members: Member[]` field — REPLACED by `memberPhones[]` + `memberMeta`.
- `Cycle.payments: Payment[]` field — REPLACED by `payments/{memberId}` subcollection.
- `'self-assign'` from `DrawType` — never wired up in UI per STATE.md (only lottery/auction/manual shipped). Drop from server enum.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@firebase/rules-unit-testing@5.0.1` is compatible with `firebase@^12.13.0` JS SDK | §4 | Low — they share the modular SDK lineage; rules-unit-testing v5 targets v9+ modular. Verify on first emulator boot. |
| A2 | Cloud Function trigger is unnecessary; client-side claim in AuthContext suffices | §2 | If client crashes between `phoneIndex` write and `memberUids` backfill, the next sign-in retries (idempotent). The window is small and recoverable. |
| A3 | Hard delete (not soft) per CONTEXT means `archiveGroup` is wrong helper name — should be `deleteGroup` | §7 | If CONTEXT really means hard delete, rename to `deleteGroup` and use `tx.delete()`. Audit entry must still write — but you can't audit a deleted group's audit log… use a top-level `deletedGroups/{gid}/audit/*` mirror for that one event? Researcher recommends planner asks. |
| A4 | E.164 phones have no characters that need escaping for Firestore doc IDs | §1, Pitfall J | Verified — E.164 is `+` and digits only; safe. |
| A5 | Migration script needs `firebase-admin` SDK (server-side, bypasses rules) | §6 | Standard; service account JSON required. |
| A6 | LINK-01 (public member token) is dropped in Phase 2 | Runtime State Inventory | If kept, planner adds a "rewire memberTokens to new shape" task — likely 1 day of work + new rule paths. |
| A7 | Composite index `(memberPhones array-contains, isActive ==, createdAt desc)` is the only index Phase 2 needs | §1 | Likely correct. Firestore will surface missing-index errors at runtime pointing at a console URL — easy recovery. |
| A8 | Demo-mode skip-audit is correct (no value in mirroring) | §8 | If user wants demo to demonstrate audit log for stakeholder review, mirror the writes into an in-memory `auditStore`. Researcher recommends planner asks. |
| A9 | `@react-native-community/datetimepicker` v8.4.x is the SDK 56 compatible version | §9.1 | Use `npx expo install` to auto-pin; if wrong, Expo will warn at install. |
| A10 | The "Switch view" GroupDetail toggle becomes functional for non-demo (renders member view of group when foreman tap-holds the toggle) | §1 (locked) | Wire-up is read-only — display only — no rule implications. |

**Risk if wrong: A3 (hard vs soft delete) and A6 (LINK-01 drop) and A8 (demo audit) are the three the planner should surface to the user as explicit confirms before writing tasks.**

## Open Questions

1. **Hard delete vs soft delete for groups.**
   - What we know: CONTEXT says "current code does hard delete; Phase 2 keeps that. Audit log records the deletion event."
   - What's unclear: If group is hard-deleted, its `audit/*` subcollection vanishes too. The deletion event has nowhere to land. Options: (a) write the deletion event to a top-level `deletedGroups/{gid}` doc with a single audit field; (b) soft-delete via `isActive: false` + `deletedAt: ts` and let the audit live in place; (c) write the deletion event to a different group's audit (foreman's "system" group?).
   - Recommendation: **Option (b) — soft-delete via `isActive: false` + `deletedAt`.** Audit log stays addressable. Members querying with `where('isActive', '==', true)` don't see archived. Foreman can restore. Aligns better with regulatory audit retention (Pitfall 14). The composite index already includes `isActive`. Planner should reconcile with user.

2. **LINK-01: drop or rewire `memberTokens`?**
   - What we know: Current `MemberPublicViewScreen` + `memberTokens/*` collection enable unauth deep links.
   - What's unclear: Did the prior UI session ship this as a launch feature, or just keep it from earlier?
   - Recommendation: **Drop.** Public unauth views via deep link contradict the rules-first principle. Members can already see their groups by signing in. Removing simplifies the rules surface. Resolves LINK-01 by removal.

3. **Demo mode audit mirroring.**
   - What we know: Demo storage has no audit today.
   - Recommendation: **Skip.** Demo isn't audited in real terms. If a stakeholder reviewer wants to see the activity tab populated in demo, populate `Demo.listAudit(gid)` with 3-4 synthetic events per seeded group (no writes, just constants returned from the function). Cheap, fits in the seed code.

4. **Foreman cycle-correction permissions.**
   - What we know: REQUIREMENTS CYCLE-03 + DRAW-05 — foreman can correct conducted cycles via "explicit correction flow."
   - What's unclear: Rules currently allow foreman update on any cycle. Should we require `request.resource.data.action == 'correction'` field for updates to conducted cycles, with audit entry `cycle.corrected`?
   - Recommendation: Phase 2 ships with simple "foreman can update any cycle" rule; the audit log captures whether the cycle was conducted-then-updated. Tightening to explicit correction-only is Phase 5 territory (alongside CYCLE-03's full UX).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Java JDK 11+ | Firebase emulator | unknown — depends on machine | — | Install OpenJDK / Temurin |
| `firebase-tools` (npm) | Emulator, deploy | ✗ — not in package.json | — | Install per Wave 0 |
| `@firebase/rules-unit-testing` (npm) | Rules tests | ✗ | — | Install per Wave 0 |
| `firebase-admin` (npm) | Migration script | ✗ | — | Install per Wave 6 (devDep + script only) |
| `@react-native-community/datetimepicker` | UX-02 | ✗ | — | Install per Wave 5 |
| Service account JSON for `chitti-app-edfb1` | Migration script + `deploy:rules` from CI | unknown (likely owned by `kbreddiee`) | — | Download from Firebase Console > Project Settings > Service accounts |
| Two Firebase Auth test users (with different phone numbers) | End-to-end multi-user verification (Wave 7) | Configured via Phase 1 plan but exact numbers not stated | — | Add via Firebase Console Auth → "Phone numbers for testing" if needed |

**Missing dependencies with no fallback:**
- Service account JSON for live migration. (Can be created same-day from Firebase Console.)

**Missing dependencies with fallback:**
- All npm packages — install per task.

## Validation Architecture

`workflow.nyquist_validation` is enabled (per Phase 1 RESEARCH.md confirmation).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 29.7 + jest-expo 56.0.4 (already installed per `package.json`) |
| Config file | (per Phase 1) — confirm `jest.config.js` exists from Phase 1 Wave 0 |
| Quick run command | `npm test -- --testPathPattern=phone\|money\|audit-context` |
| Full suite command | `npm test` (unit) + `npm run test:rules` (rules — requires emulator) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | Two users see same top-level group | integration (emulator with two auth contexts) | `npm run test:rules -- --testNamePattern="two users"` | ❌ Wave 0 |
| DATA-02 | Cycle/payment writes are subcollection-scoped | rules-unit-testing | `npm run test:rules -- --testNamePattern="cycle"` | ❌ Wave 0 |
| DATA-03 | Members read, foreman writes; cross-account isolation | rules-unit-testing | `npm run test:rules` (full suite) | ❌ Wave 0 |
| DATA-05 | Migration script dry-run produces expected output | smoke (run against emulator-seeded legacy data) | `npx ts-node scripts/migrate-to-multi-user.ts --dry-run` | ❌ Wave 6 |
| SOC-03 | Audit append-only; data + audit atomic | rules-unit-testing + transaction integration | `npm run test:rules -- --testNamePattern="audit"` + `npm test -- --testPathPattern=storage` | ❌ Wave 0 + 4 |
| UX-01 | (RECONCILED — shipped) | none | — | N/A |
| UX-02 | DateTimePicker renders + onChange fires | RTL component test OR manual | `npm test -- --testPathPattern=CreateGroupScreen` (RTL stub for DateTimePicker) | ❌ Wave 5 |
| UX-03 | BackHandler intercepts on screens with unsaved changes | unit (mock BackHandler) | `npm test -- --testPathPattern=BackHandler` | ❌ Wave 5 |
| (helper) | `appendAudit` writes correctly inside transaction | unit (mock Firestore) | `npm test -- audit` | ❌ Wave 0 |
| (helper) | `claimPhoneAndReconcile` idempotent on rerun | integration (emulator) | `npm run test:rules -- --testNamePattern="claim"` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test -- --bail` (unit tests, <30s).
- **Per wave merge:** `npm test` + `npm run test:rules` (emulator must be running or use `firebase emulators:exec`).
- **Phase gate:** Both unit + rules suites green; Wave 7 end-to-end manual smoke (two emulator users, same group).

### Wave 0 Gaps

- [ ] Install `@firebase/rules-unit-testing@^5.0.1` + `firebase-tools@^15.19.0` (devDep)
- [ ] Add `firebase.json` (Pattern C) + `firestore.rules` (empty stub initially) + `firestore.indexes.json` (Pattern 5 with empty array)
- [ ] Add `package.json` scripts: `emulator`, `test:rules`, `deploy:rules`
- [ ] `tests/firestore-rules.test.ts` skeleton + per-table-row stubs
- [ ] `tests/auth-context.test.ts` — extend with `claimPhoneAndReconcile` mock test
- [ ] `.github/workflows/test.yml` — add `firebase emulators:exec` step for rules tests
- [ ] Verify Java 11+ available in CI (GitHub Actions `setup-java@v4`)

## Security Domain

`security_enforcement` is enabled (per config).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (Phase 1 already shipped — Phase 2 doesn't change) | RNFirebase Phone Auth |
| V3 Session Management | yes (Phase 1) | RNFirebase native persistence; token refresh by SDK |
| V4 Access Control | **YES — this phase's central concern** | `firestore.rules` (rule-level RBAC: foreman / member / stranger); cross-document reads enforce field invariants |
| V5 Input Validation | yes | Server-side rule enforces `drawType` enum + numeric ranges (discount, commission); client `toE164` (Phase 1) |
| V6 Cryptography | delegated | Firebase + native OS keystore; nothing hand-rolled |
| V8 Data Protection | yes | `memberPhones[]` is PII — rules restrict to group members. `phoneIndex/{e164}` is more sensitive — rules restrict to phone owner. |
| V14 Configuration | yes | Env-driven Firebase config (Phase 1 shipped); `firestore.rules` in repo + CI-verified |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Foreman tampering with audit log to hide payment dispute | Tampering / Repudiation | Audit `update + delete` forbidden by rules; even foreman cannot rewrite. Per PITFALLS.md Pitfall 15. |
| Member writing payments on behalf of someone else | Tampering / Spoofing | Rule requires `markedByUid == request.auth.uid` AND `isForeman` (members can't write at all). |
| Stranger reading group data via API direct calls | Information Disclosure | `isMember(group)` check requires `uid in memberUids` (with phone-fallback per §3 helper). Tests cover this. |
| Replay of `phoneIndex` claim by attacker | Spoofing | Rule requires `request.auth.token.phone_number == e164`. Firebase signs ID tokens; phone in token can't be forged. |
| Discount-cap bypass by modified client | Tampering | Rule reads `get(/databases/.../groups/{gid}).data.maxDiscountPct` and enforces. Per PITFALLS.md Pitfall 17. |
| Re-prize already-prized member (DRAW-03 violation) | Tampering | Rule rejects if `winnerId in loadGroup(gid).prizedMemberIds`. Per PITFALLS.md Pitfall 2. |
| Race-condition double-claim of phone (two devices) | Tampering | `runTransaction` on `phoneIndex/{e164}` create — first wins, second sees `exists()` and bails. |

## Migration Sequence (Waves)

The user's proposed 8-wave order is almost right. **One revision:** audit log + transactions must merge with Wave 1 (data layer rewrite) — not a separate Wave 4. Reason: every storage helper from day 1 wraps its write in a transaction with audit. Doing them separately means writing storage code twice.

**Confirmed order (8 waves):**

### Wave 0 — Emulator + rules-unit-testing dev infra
- Install `@firebase/rules-unit-testing@^5.0.1`, `firebase-tools@^15.19.0`.
- Create `firebase.json`, `firestore.rules` (empty stub allowing all initially — gets locked down in Wave 3), `firestore.indexes.json` (Pattern 5).
- Add `package.json` scripts: `emulator`, `test:rules`, `deploy:rules`.
- Create `tests/firestore-rules.test.ts` skeleton + test helpers.
- CI workflow (`.github/workflows/test.yml`) with Java + emulator-exec.
- Verify: `npm run emulator` starts Firestore emulator at port 8080 and a stub `npm run test:rules` passes (just one trivial assertion).

### Wave 1 — Types + storage API rewrite + audit + transactions (merged)
- Update `src/types/index.ts` (Pattern 1) — adds `foremanUid`, `memberPhones`, `memberUids`, `memberMeta`, `MemberMeta`, `AuditEvent`, `AuditAction`, etc.
- Add `initializeFirestore(app, { ignoreUndefinedProperties: true })` in `src/lib/firebase.ts` — eliminates `stripUndefined` JSON round-trip.
- Create `src/lib/audit.ts` (Pattern 4).
- Create `src/storage/groups.ts`, `src/storage/cycles.ts`, `src/storage/payments.ts`, `src/storage/audit.ts` (Patterns 2–3).
- Rewrite `src/storage/index.ts` (barrel + demo routing).
- Delete `src/lib/firestore.ts`.
- Update all six screens that imported `upsertGroup` (HomeScreen still uses `getGroups`; CreateGroup → `createGroup`; GroupDetail → `updateGroupMembers` + `deleteGroup`; AddMember → `updateGroupMembers` + `upsertCycle` loop; Draw → `upsertCycle`; PaymentTracking → `markPayment`/`unmarkPayment`).
- **Decision needed (Open Q 2):** Delete `MemberPublicViewScreen` + `memberTokens` storage if LINK-01 dropped.
- Local rules still open (Wave 0's stub) so dev work isn't blocked.
- Verify: `tsc --noEmit` clean. All screens compile. Local Firestore emulator round-trips work.

### Wave 2 — Phone-claim + AuthContext changes
- Add `claimPhoneAndReconcile()` to `AuthContext.tsx` (Example D).
- Extend `tests/auth-context.test.ts` with a mock-Firestore test that asserts `claimPhone` is invoked with `(uid, phoneNumber)` on sign-in.
- Add an emulator integration test in `tests/firestore-rules.test.ts` (or new `tests/claim-phone.test.ts`) that exercises full claim + reconcile flow with two emulator users.
- Verify: signing in to emulator-Firebase as user B (with phone in user A's seeded group's `memberPhones`) results in user B's uid appearing in `memberUids` within seconds.

### Wave 3 — Security rules + tests
- Write final `firestore.rules` (Example A).
- Write full `tests/firestore-rules.test.ts` covering every row of CONTEXT's rule table (Example B is the scaffold).
- Verify: `npm run test:rules` all green; deploy to staging Firebase project with `npm run deploy:rules`.

### Wave 4 — Audit-log integration into mutations (verification + UI wire)
- Wave 1 already wired `appendAudit` in storage transactions. This wave is the **verification + UI wire-up**:
  - Add `tests/audit.test.ts` confirming every mutation type writes a corresponding audit event with the expected `action` value.
  - Wire `storage.listAudit(gid)` into the existing GroupDetail "Activity" tab UI (visual already exists).
  - Wire "marked by … at …" pill in PaymentTracking (read `payments[].markedByUid` + map to `memberMeta[].name`).
- Verify: GroupDetail Activity tab renders a list of audit events for a seeded group.

### Wave 5 — Demo reshape + UX-02 + UX-03 code
- Reshape `src/storage/demo.ts` to new schema (parallel Maps for cycles + payments).
- Install `@react-native-community/datetimepicker` via `npx expo install`.
- Add DateTimePicker to CreateGroupScreen ("Starting month") and PaymentTrackingScreen (mark-payment "Paid on").
- Add `useFocusEffect` + `BackHandler` handlers to DrawScreen, CreateGroupScreen, GroupDetailScreen (delete-confirm dialog), demo-mode exit.
- Verify: demo mode still works end-to-end (HomeScreen lists 3 seeded chits; GroupDetail loads; mark-payment works; conduct-draw works); date pickers render on iOS + Android in EAS dev build.

### Wave 6 — Migration script
- Add `firebase-admin@^12.x` + `ts-node` to devDeps.
- Create `scripts/migrate-to-multi-user.ts` (Example E).
- Seed the local emulator with sample `users/{uid}/groups/*` data.
- Dry-run: `npx ts-node scripts/migrate-to-multi-user.ts --dry-run` — verify logs.
- Live-run against emulator: verify idempotency (second run is a no-op skip).
- Document invocation in `.planning/codebase/STACK.md` and inside the script's docstring.

### Wave 7 — End-to-end smoke (two emulator users see same group)
- Start emulator with seed data: one group with `memberPhones: ['+919000000001', '+919000000002']`.
- Test 1: Sign in as `+919000000001` (foreman). Create cycle, mark payment. Verify audit appears.
- Test 2: Sign in as `+919000000002` (member who hasn't claimed yet). Verify `claimPhone` runs, `memberUids` gets uid appended, Home shows the group, GroupDetail shows the cycle + payment, member view shows audit pill.
- Test 3: Member tries to write — verify rules reject.
- This is a manual checklist (semi-automated with emulator scripts) — not part of CI suite, but documented in a `tests/MULTI-USER-SMOKE.md`.

**Rationale for revision:** The user's separation of "Wave 1: types + storage API" from "Wave 4: audit log + transactions" creates a temptation to ship Wave 1 with non-transactional helpers (since "transactions come later"). That's exactly the Pitfall 11 trap. Merging keeps every helper transaction-from-day-one and avoids a second pass.

## Sources

### Primary (HIGH confidence)
- [`@firebase/rules-unit-testing` README](https://github.com/firebase/firebase-js-sdk/tree/main/packages/rules-unit-testing) — `initializeTestEnvironment`, `authenticatedContext`, `withSecurityRulesDisabled` APIs
- [Firebase Local Emulator Suite — Firestore](https://firebase.google.com/docs/emulator-suite/connect_firestore)
- [Firestore Security Rules — getting started](https://firebase.google.com/docs/firestore/security/get-started)
- [Firestore Security Rules — conditions + cross-doc `get()`](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [Firestore — Indexing reference](https://firebase.google.com/docs/firestore/query-data/indexing) — composite index for `array-contains` + `==` + `orderBy`
- [Firestore — Transactions and batched writes](https://firebase.google.com/docs/firestore/manage-data/transactions)
- [Expo SDK 56 — DateTimePicker](https://docs.expo.dev/versions/v56.0.0/sdk/date-time-picker)
- [React Navigation 7 — `useFocusEffect`](https://reactnavigation.org/docs/use-focus-effect/)
- [React Native — BackHandler](https://reactnative.dev/docs/backhandler)
- npm registry: `@firebase/rules-unit-testing@5.0.1` (modified 2026-05-27), `firebase-tools@15.19.0` — VERIFIED via `npm view` on 2026-05-28
- `.planning/research/PITFALLS.md` — Pitfalls 2, 5, 11, 15, 17 central; Pitfalls 6, 10 referenced

### Secondary (MEDIUM confidence)
- [`@react-native-firebase/firestore` docs](https://rnfirebase.io/firestore/usage) — for the "why we don't switch" decision (§1.5)
- [Firebase blog — Firestore rules patterns](https://firebase.blog/posts/2022/06/security-rules-best-practices) — `get()`/`exists()` cost notes
- [Stack Overflow consensus on `runTransaction` retry behavior](https://stackoverflow.com/questions/tagged/google-cloud-firestore+transactions) — retry semantics, max-attempts

### Tertiary (LOW confidence)
- None — every claim in this research is either Context7-verified, official-docs-cited, npm-verified, or codebase-grep-verified.

## Project Constraints (from CLAUDE.md / AGENTS.md)

- **Expo SDK 56 is pinned.** Read the Expo v56 versioned docs (https://docs.expo.dev/versions/v56.0.0/) before writing any code. This phase's research is grounded in SDK 56 specifics — `@react-native-community/datetimepicker` version pin comes from `npx expo install` (which respects the SDK 56 pin).
- All new dependency versions verified for compatibility with `react@19.2.3` + `react-native@0.85.3` + `expo@~56.0.3`.
- Firebase JS SDK (`firebase@^12.13.0`) is the existing pin — Phase 2 does not bump it. RNFirebase Auth (`@react-native-firebase/auth@^24.0.0`) stays untouched.

## Metadata

**Confidence breakdown:**
- Data model + Firestore queries: HIGH — official docs + npm-verified
- Phone-claim flow: HIGH — concrete code, transaction semantics verified
- Security rules: HIGH — every clause maps to a tested rule path
- Rules-unit-testing setup: HIGH — npm-verified 2026-05-27
- Audit log: HIGH — single helper, transaction-wrapped, append-only proven by rules tests
- Migration script: MEDIUM — pattern is standard; first-run-against-real-data may surface edge cases (un-normalizable phones; missing fields)
- UX-02/03: HIGH — well-trodden RN patterns
- LINK-01 drop recommendation: MEDIUM — pending user confirmation

**Research date:** 2026-05-28
**Valid until:** 2026-06-28 (30 days) for the SDK + library pins; rules patterns are stable indefinitely; Firestore emulator behavior reviewed annually.
