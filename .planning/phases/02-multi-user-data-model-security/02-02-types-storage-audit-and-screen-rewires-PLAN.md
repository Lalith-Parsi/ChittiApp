---
phase: 02-multi-user-data-model-security
plan: 02
type: execute
wave: 1
depends_on: [02-01]
files_modified:
  - src/types/index.ts
  - src/lib/firebase.ts
  - src/lib/audit.ts
  - src/storage/groups.ts
  - src/storage/cycles.ts
  - src/storage/payments.ts
  - src/storage/audit.ts
  - src/storage/index.ts
  - src/lib/firestore.ts
  - src/screens/CreateGroupScreen.tsx
  - src/screens/GroupDetailScreen.tsx
  - src/screens/AddMemberScreen.tsx
  - src/screens/DrawScreen.tsx
  - src/screens/PaymentTrackingScreen.tsx
  - src/screens/CycleReceiptScreen.tsx
  - src/screens/MemberDetailScreen.tsx
  - src/screens/HomeScreen.tsx
  - src/screens/MemberPublicViewScreen.tsx
  - src/navigation/AppNavigator.tsx
  - package.json
autonomous: true
requirements: [DATA-01, DATA-02, SOC-03]
must_haves:
  truths:
    - "Every screen that previously imported `upsertGroup` compiles against the new granular storage API"
    - "Every data-mutating storage helper wraps its Firestore write + audit write in a single runTransaction"
    - "appendAudit can only be invoked with an active Transaction argument (TypeScript signature enforces)"
    - "Legacy MemberPublicViewScreen, memberTokens helpers, and chitti://member/:token deep link are removed (LINK-01 dropped)"
    - "src/lib/firestore.ts is deleted; new code lives under src/storage/*"
  artifacts:
    - path: "src/types/index.ts"
      provides: "ChittiGroup with foremanUid/memberPhones/memberUids/memberMeta/prizedMemberIds, MemberMeta, AuditEvent, AuditAction, PhoneIndexEntry; LegacyMember kept for migration; Cycle.payments[] field removed"
    - path: "src/lib/audit.ts"
      provides: "appendAudit(tx: Transaction, gid, input): void"
    - path: "src/storage/groups.ts"
      provides: "groupsForUser, getGroup, createGroup, updateGroup, archiveGroup (soft-delete per locked decision)"
    - path: "src/storage/cycles.ts"
      provides: "listCycles, upsertCycle (transactional with hasReceived flip + prizedMemberIds update + audit)"
    - path: "src/storage/payments.ts"
      provides: "listPayments, markPayment, unmarkPayment (transactional with audit)"
    - path: "src/storage/audit.ts"
      provides: "listAuditForGroup (read-only client query, ordered desc by timestamp)"
    - path: "src/storage/index.ts"
      provides: "barrel + __demoMode routing; no direct firebase/firestore imports in screens"
  key_links:
    - from: "src/storage/groups.ts"
      to: "src/lib/audit.ts"
      via: "appendAudit(tx, gid, {action, before, after}) inside every runTransaction"
      pattern: "appendAudit\\(tx,"
    - from: "src/storage/cycles.ts upsertCycle"
      to: "src/storage/groups.ts group doc"
      via: "tx.update memberMeta + prizedMemberIds + cycle in one transaction"
      pattern: "prizedMemberIds"
    - from: "screens"
      to: "src/storage barrel"
      via: "named imports — never import 'firebase/firestore' directly"
      pattern: "from '\\.\\./storage'"
tags: [data-layer, firestore, transactions, audit, storage-shim, screens]
---

<objective>
Replace the per-user `users/{uid}/groups/*` data layer with the locked top-level `groups/{groupId}` shape, ship the append-only audit log, and wrap every mutation in a single runTransaction. This wave merges three logically-separate concerns (data, audit, transactions) per the researcher's revision — anything else risks shipping non-transactional helpers in a "Wave 1" that "Wave 4" tries to retrofit.

Purpose: This is the keystone of Phase 2. After this plan, the data on disk is multi-user-shaped and every write is audited.
Output: New types, new storage modules, audit helper, six rewired screens, MemberPublicViewScreen removed, src/lib/firestore.ts deleted.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/phases/02-multi-user-data-model-security/02-CONTEXT.md
@.planning/phases/02-multi-user-data-model-security/02-RESEARCH.md
@AGENTS.md
@src/storage/index.ts
@src/lib/firestore.ts
@src/types/index.ts
</context>

<interfaces>
<!-- Locked type/API contracts the executor MUST emit verbatim. -->
<!-- Sources: 02-RESEARCH.md §"Pattern 1" (types), §"Pattern 2" (groups.ts), §"Pattern 3" (cycles + payments), §"Pattern 4" (audit), §"Storage Shim Rewrite Plan" (barrel + screen impact table). -->

`src/types/index.ts` MUST export:
  - interface MemberMeta { name: string; phone: string; hasReceived: boolean; cycleReceived?: number; joinedAt: string; uid?: string; status: 'pending' | 'active' | 'removed'; }
  - interface ChittiGroup with NEW fields: foremanUid: string; memberPhones: string[]; memberUids: string[]; memberMeta: Record<string, MemberMeta>; prizedMemberIds?: string[]; isActive: boolean; deletedAt?: string  -- and REMOVED fields: members[], cycles[]
  - interface Cycle WITHOUT the `payments: Payment[]` field; drawType narrows to 'lottery'|'auction'|'manual' (drop 'self-assign')
  - interface Payment with markedByUid?: string field added
  - type AuditAction = 'group.created'|'group.archived'|'group.restored'|'member.added'|'member.removed'|'member.activated'|'cycle.created'|'cycle.conducted'|'cycle.corrected'|'payment.marked'|'payment.unmarked'|'settings.changed'
  - interface AuditEvent { id, actorUid, actorRole: 'foreman'|'member'|'system', action: AuditAction, before?, after?, timestamp: Timestamp|FieldValue, notes? }
  - interface PhoneIndexEntry { uid: string; claimedAt: Timestamp | FieldValue }
  - @deprecated interface LegacyMember (kept for migration script reads only)

`src/lib/audit.ts` exports:
  export function appendAudit(tx: Transaction, groupId: string, input: { action: AuditAction; before?: unknown; after?: unknown; notes?: string; actorRole?: 'foreman'|'member'|'system' }): void
  (Signature REQUIRES Transaction first arg — uses `import { Transaction } from 'firebase/firestore'`. No overload without tx.)

`src/storage/groups.ts` exports:
  groupsForUser(myPhone: string): Promise<ChittiGroup[]>            // where memberPhones array-contains + isActive==true + orderBy createdAt desc
  getGroup(gid: string): Promise<ChittiGroup | null>
  createGroup(input: Omit<ChittiGroup, 'foremanUid'|'memberUids'>): Promise<void>   // sets foremanUid + memberUids=[uid] + audit 'group.created'
  updateGroup(gid: string, patch: Partial<ChittiGroup>, action: AuditAction): Promise<void>   // transactional read-before/write-after/audit
  archiveGroup(gid: string): Promise<void>   // SOFT delete per locked policy: tx.update isActive=false, deletedAt=serverTimestamp(), audit 'group.archived'
  restoreGroup(gid: string): Promise<void>   // tx.update isActive=true, deletedAt=null, audit 'group.restored'

`src/storage/cycles.ts` exports:
  listCycles(gid): Promise<Cycle[]>
  upsertCycle(gid, cycle): Promise<void>  // transactional: write cycle doc, if conducted: update group memberMeta[winnerId].hasReceived=true + cycleReceived=cycle.cycleNumber + prizedMemberIds union winnerId, audit 'cycle.created' or 'cycle.conducted'

`src/storage/payments.ts` exports:
  listPayments(gid, cid): Promise<Payment[]>
  markPayment(gid, cid, memberId, mode, note?, paidDate?): Promise<void>   // tx: read before, write {paid:true, mode, note, paidDate, markedByUid:auth().currentUser.uid}, audit 'payment.marked'
  unmarkPayment(gid, cid, memberId): Promise<void>   // tx: read before, write {paid:false, markedByUid}, audit 'payment.unmarked'

`src/storage/audit.ts` exports:
  listAuditForGroup(gid: string, limit?: number): Promise<AuditEvent[]>   // collection(db,'groups',gid,'audit') orderBy timestamp desc limit ?? 100

`src/storage/index.ts` (barrel): re-exports above with __demoMode short-circuit. Signature mapping:
  getGroups() -> demo OR groupsForUser(myPhone())
  getGroupById(id) -> demo OR getGroup(id)
  createGroup(g) -> demo OR groups.createGroup(g)
  updateGroupMembers(gid, patch) -> demo OR groups.updateGroup(gid, patch, 'member.added')
  deleteGroup(id) -> demo OR groups.archiveGroup(id)     // SOFT delete on real backend
  listCycles, upsertCycle, listPayments, markPayment, unmarkPayment, listAudit  (listAudit demo returns [])
</interfaces>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Update src/types/index.ts + src/lib/firebase.ts; create src/lib/audit.ts</name>
  <files>src/types/index.ts, src/lib/firebase.ts, src/lib/audit.ts, package.json</files>
  <read_first>
    - src/types/index.ts (current Member, ChittiGroup, Cycle, Payment shapes)
    - src/lib/firebase.ts (current initializeApp + db export)
    - 02-RESEARCH.md §"Pattern 1" (lines ~199-310) and §"Pattern 4" (lines ~466-503)
    - 02-RESEARCH.md §"State of the Art" — note the `initializeFirestore(app, { ignoreUndefinedProperties: true })` upgrade
  </read_first>
  <behavior>
    - appendAudit refuses to compile (TS error) when called without a Transaction first arg
    - appendAudit writes to `groups/{gid}/audit/{generatedEventId}` with `actorUid` from `auth().currentUser?.uid ?? 'system'`, `timestamp: serverTimestamp()`, `id: <generated>` matching the doc ID, all fields from input
    - ChittiGroup type no longer has `members: Member[]` or `cycles: Cycle[]` fields (compile-time removal — screens that read those will get TS errors and be fixed in Task 3)
    - LegacyMember interface exported with `@deprecated` JSDoc for migration script use only
    - Cycle type no longer has `payments: Payment[]` field
    - Cycle.drawType union narrows to `'lottery'|'auction'|'manual'` (no 'self-assign')
  </behavior>
  <action>
    Install `uuid@^9` and `@types/uuid@^9` via `npm install uuid@^9 && npm install --save-dev @types/uuid@^9` (used by appendAudit for event IDs).

    Update `src/types/index.ts` per interfaces block above. KEEP existing `Member` type but mark `@deprecated — replaced by MemberMeta in ChittiGroup.memberMeta`. Rename existing `Member` to `LegacyMember` ONLY if no in-repo non-migration code still references it; otherwise leave `Member` + add `LegacyMember = Member` alias. Add imports `import type { FieldValue, Timestamp } from 'firebase/firestore'` at top.

    Update `src/lib/firebase.ts`: replace `getFirestore(app)` with `initializeFirestore(app, { ignoreUndefinedProperties: true })`. Keep the existing `db` export name. Add a top-of-file comment noting `stripUndefined` JSON round-trip from old `firestore.ts` is no longer needed (the SDK now silently drops undefined fields).

    Create `src/lib/audit.ts` per RESEARCH §"Pattern 4" verbatim. Signature: `export function appendAudit(tx: Transaction, groupId: string, input: AuditInput): void`. Imports: `import { doc, serverTimestamp, Transaction } from 'firebase/firestore'; import { db } from './firebase'; import auth from '@react-native-firebase/auth'; import { v4 as uuidv4 } from 'uuid'; import { AuditEvent, AuditAction } from '../types';`. Function generates `eventId = uuidv4()`, builds AuditEvent with `id: eventId, actorUid: auth().currentUser?.uid ?? 'system', actorRole: input.actorRole ?? 'foreman', timestamp: serverTimestamp()`, calls `tx.set(doc(db,'groups',groupId,'audit',eventId), event)`. No return value.

    NO TESTS in this task — Wave 4 (plan 02-05) adds the integration tests. But ensure tsc strict mode catches a misuse: in `tests/audit-helper-typecheck.test.ts` create a single file that calls `appendAudit('gid', {...})` with a TS-ignore comment to demonstrate it fails to compile WITHOUT the directive — actually NO: do not add a typecheck test (jest+ts-jest will fail to compile any bad call automatically). Skip.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | tee /tmp/tsc.log; test ! -s /tmp/tsc.log && node -e "const fs=require('fs');const a=fs.readFileSync('src/lib/audit.ts','utf8');for (const s of ['Transaction','appendAudit','serverTimestamp','uuidv4','tx.set']) if(!a.includes(s)){console.error('audit.ts missing '+s);process.exit(1)};const t=fs.readFileSync('src/types/index.ts','utf8');for (const s of ['MemberMeta','memberPhones','memberUids','foremanUid','prizedMemberIds','AuditAction','AuditEvent','PhoneIndexEntry']) if(!t.includes(s)){console.error('types missing '+s);process.exit(1)};const fb=fs.readFileSync('src/lib/firebase.ts','utf8'); if(!fb.includes('initializeFirestore')||!fb.includes('ignoreUndefinedProperties')){console.error('firebase.ts missing initializeFirestore');process.exit(1)};console.log('ok')"</automated>
  </verify>
  <acceptance_criteria>
    - tsc --noEmit exits 0
    - `src/lib/audit.ts` exists, exports `appendAudit(tx: Transaction, gid, input)` with no overload accepting a non-Transaction first arg
    - `src/types/index.ts` exports MemberMeta, AuditEvent, AuditAction, PhoneIndexEntry; ChittiGroup has foremanUid/memberPhones/memberUids/memberMeta/prizedMemberIds + isActive + optional deletedAt
    - ChittiGroup no longer has `members` or `cycles` arrays (this WILL break screens — fixed in Task 3)
    - `src/lib/firebase.ts` calls `initializeFirestore(app, { ignoreUndefinedProperties: true })`
    - `uuid` + `@types/uuid` in package.json
  </acceptance_criteria>
  <done>Types + audit helper + firebase init upgrade landed; remaining tsc errors are confined to screens + src/storage/* (fixed in Task 3).</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Create src/storage/{groups,cycles,payments,audit}.ts with transactional + audit-wrapped helpers</name>
  <files>src/storage/groups.ts, src/storage/cycles.ts, src/storage/payments.ts, src/storage/audit.ts</files>
  <read_first>
    - 02-RESEARCH.md §"Pattern 2" (groups.ts lines ~314-373)
    - 02-RESEARCH.md §"Pattern 3" (cycles + payments lines ~378-463)
    - 02-RESEARCH.md §"Don't Hand-Roll" (transaction discipline, lines ~549-558)
    - 02-RESEARCH.md §"Pitfall H" (no toasts/logs inside transaction bodies — they retry)
    - The additional locked decision: soft-delete only. `archiveGroup` is the helper (NOT a `deleteGroup` that calls `tx.delete`)
  </read_first>
  <behavior>
    - `createGroup(input)` runs `runTransaction`: tx.set group doc with `foremanUid=auth uid` and `memberUids=[uid]` and `isActive=true`; calls `appendAudit(tx, id, { action: 'group.created', after: fullGroup })`
    - `updateGroup(gid, patch, action)` runs tx: tx.get group, capture `before = snap.data()`, throw if !snap.exists(), `tx.update(groupDoc, patch)`, `appendAudit(tx, gid, { action, before, after: { ...before, ...patch } })`
    - `archiveGroup(gid)` runs tx: read group, `tx.update(groupDoc, { isActive: false, deletedAt: serverTimestamp() })`, `appendAudit(tx, gid, { action: 'group.archived', before, after })` — DOES NOT call `tx.delete`
    - `restoreGroup(gid)` runs tx: `tx.update(groupDoc, { isActive: true, deletedAt: null })`, audit `group.restored`
    - `upsertCycle(gid, cycle)` runs tx: read group, write cycle doc, IF `cycle.conducted && cycle.winnerId`: update group `memberMeta[winnerId] = {...prev, hasReceived: true, cycleReceived: cycle.cycleNumber}` AND `prizedMemberIds = Array.from(new Set([...prev, winnerId]))`; audit action is `'cycle.conducted'` else `'cycle.created'`
    - `markPayment(gid, cid, mid, mode, note?, paidDate?)` runs tx: read previous payment doc (if any) as `before`, build `after = {memberId: mid, paid: true, mode, note, paidDate: paidDate ?? new Date().toISOString(), markedByUid: auth().currentUser.uid}`, tx.set, audit `'payment.marked'`
    - `unmarkPayment(gid, cid, mid)` runs tx: read before, write `{memberId: mid, paid: false, markedByUid}`, audit `'payment.unmarked'`
    - `listAuditForGroup(gid, limit=100)` queries `collection(db,'groups',gid,'audit')` `orderBy('timestamp','desc')` `limit(limit)`, returns AuditEvent[]
    - All write helpers throw `new Error('Not authenticated')` when `auth().currentUser?.uid` is null
    - Transaction bodies contain ZERO `console.log`, `Toast`, or other side-effecting calls (per Pitfall H — transactions retry)
  </behavior>
  <action>
    Create the four new files per the interfaces block + behavior above. Code patterns from RESEARCH §"Pattern 2" and §"Pattern 3" — copy verbatim where applicable. Key deviations from research:

    - `archiveGroup` (not the research-suggested `deleteGroup` that hard-deletes). Soft-delete is the locked policy. Read Q1 in researcher recommendations.
    - All audit calls pass concrete `before`/`after` shapes — not `unknown`. The audit helper accepts unknown; callers pass the actual shape.

    For `listCycles(gid)`: `getDocs(query(collection(db,'groups',gid,'cycles'), orderBy('cycleNumber','asc')))`. For `listPayments(gid, cid)`: `getDocs(collection(db,'groups',gid,'cycles',cid,'payments'))`.

    Each module: import `db` from `'../lib/firebase'`, `auth` from `'@react-native-firebase/auth'`, `appendAudit` from `'../lib/audit'`. Top-level file comment naming the responsibility (e.g. `/** src/storage/groups.ts — top-level groups/{id} CRUD. All mutations transactional + audit-wrapped. */`).

    No demo logic in these files (demo routing is the barrel's job — Task 4).

    Companion test scaffold: write `tests/storage-transactions.test.ts` that mocks `firebase/firestore`'s `runTransaction` to verify markPayment/unmarkPayment/upsertCycle ALL invoke `runTransaction` (one assertion per helper). This proves no helper accidentally skips the transaction wrap. Wave 4 (plan 02-05) deepens these with real-emulator integration.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | grep -E "storage/(groups|cycles|payments|audit)\\.ts" | tee /tmp/tsc-storage.log; test ! -s /tmp/tsc-storage.log && node -e "const fs=require('fs');for (const f of ['src/storage/groups.ts','src/storage/cycles.ts','src/storage/payments.ts','src/storage/audit.ts']) {if(!fs.existsSync(f)){console.error('missing '+f);process.exit(1)};const c=fs.readFileSync(f,'utf8');if (f.includes('groups')&&(!c.includes('runTransaction')||!c.includes('archiveGroup')||c.includes('tx.delete'))){console.error('groups.ts wrong shape');process.exit(1)};if (f.includes('cycles')&&(!c.includes('prizedMemberIds')||!c.includes('runTransaction'))){console.error('cycles.ts wrong shape');process.exit(1)};if (f.includes('payments')&&(!c.includes('markedByUid')||!c.includes('runTransaction'))){console.error('payments.ts wrong shape');process.exit(1)};if (f.includes('audit.ts')&&!c.includes('orderBy')){console.error('audit.ts wrong shape');process.exit(1)}};console.log('ok')" && npm test -- --testPathPattern=storage-transactions --bail</automated>
  </verify>
  <acceptance_criteria>
    - All four files exist and compile (tsc --noEmit clean for these paths)
    - `groups.ts` exports `groupsForUser, getGroup, createGroup, updateGroup, archiveGroup, restoreGroup`; NO `tx.delete` anywhere
    - `cycles.ts` `upsertCycle` reads group, conditionally updates `memberMeta` + `prizedMemberIds`, calls `appendAudit(tx, ...)` once
    - `payments.ts` `markPayment` + `unmarkPayment` always set `markedByUid` from `auth().currentUser.uid`, throw if not authed, audit inside the tx
    - `audit.ts` `listAuditForGroup` orders by timestamp desc with a configurable limit (default 100)
    - `tests/storage-transactions.test.ts` exists with at least one assertion per write helper that `runTransaction` was called
    - `npm test -- --testPathPattern=storage-transactions` green
  </acceptance_criteria>
  <done>Four storage modules shipped; every mutation is transactional + audited; one unit test per helper proves it.</done>
</task>

<task type="auto">
  <name>Task 3: Rewrite src/storage/index.ts as barrel + rewire all six screens + delete legacy</name>
  <files>src/storage/index.ts, src/lib/firestore.ts, src/screens/HomeScreen.tsx, src/screens/CreateGroupScreen.tsx, src/screens/GroupDetailScreen.tsx, src/screens/AddMemberScreen.tsx, src/screens/DrawScreen.tsx, src/screens/PaymentTrackingScreen.tsx, src/screens/CycleReceiptScreen.tsx, src/screens/MemberDetailScreen.tsx, src/screens/MemberPublicViewScreen.tsx, src/navigation/AppNavigator.tsx</files>
  <read_first>
    - src/storage/index.ts (current barrel — short, 37 lines)
    - 02-RESEARCH.md §"Storage Shim Rewrite Plan" (lines ~1162-1261 — barrel code + screen impact table)
    - Each screen file before modifying (use Grep to find `upsertGroup` and `from '../lib/firestore'` and `getGroupByMemberToken` usages)
    - src/navigation/AppNavigator.tsx (find MemberPublicView route registration)
    - Additional locked decision #2: LINK-01 dropped. MemberPublicViewScreen + memberTokens helpers MUST be removed.
  </read_first>
  <action>
    1. **Rewrite `src/storage/index.ts`** per RESEARCH lines ~1170-1245. Barrel imports `* as G from './groups'`, `* as C from './cycles'`, etc., and `* as Demo from './demo'`. Add `function myPhone(): string` helper that reads `auth().currentUser?.phoneNumber`. Demo seeding stays — Wave 5 (plan 02-06) reshapes demo internals, not the barrel surface.

       For demo `createGroup`: pass through to `Demo.upsertGroup({ ...g, foremanUid: 'demo-user', memberUids: ['demo-user'] } as ChittiGroup)`.
       For real `deleteGroup`: route to `G.archiveGroup(id)` (soft delete — barrel public name stays `deleteGroup` for screen compat, but underlying implementation is archive).

    2. **Delete `src/lib/firestore.ts`** entirely. Its `getGroupByMemberToken` + `saveMemberToken` helpers (used by MemberPublicViewScreen) go away with LINK-01.

    3. **Rewire screens** per the RESEARCH "Screens that break" table:
       - `HomeScreen.tsx`: existing `getGroups()` call already works via barrel (no source change); but if it indexes `group.members` or `group.cycles`, refactor to call `listCycles(gid)` / use `Object.values(group.memberMeta)`. Touch only what breaks.
       - `CreateGroupScreen.tsx`: replace `upsertGroup(newGroup)` with `createGroup(newGroup)`. The cycle-initialization loop (`initializeCycles(group)`) now writes via `for (const c of cycles) await upsertCycle(group.id, c)` AFTER createGroup resolves.
       - `GroupDetailScreen.tsx`: replace `upsertGroup(updated)` with `updateGroupMembers(gid, patch)`. Replace `deleteGroup(gid)` — name unchanged on barrel, real path now soft-archives.
       - `AddMemberScreen.tsx`: split the single `upsertGroup({...group, members: ..., cycles})` into (a) `updateGroupMembers(gid, { memberPhones: [...new e164 list], memberMeta: {...updatedMap} })` then (b) for each newly-needed cycle, `await upsertCycle(gid, cycle)`. Member's `phone` must already be E.164 (Phase 1 toE164).
       - `DrawScreen.tsx`: replace the `upsertGroup({...group, members: updatedMembers, cycles: updatedCycles})` with `upsertCycle(gid, conductedCycle)` only — the `memberMeta[winnerId].hasReceived` + `prizedMemberIds` flip happens INSIDE upsertCycle's transaction (Pattern 3). DO NOT also call `updateGroupMembers` for that flip; doing so loses atomicity.
       - `PaymentTrackingScreen.tsx`: replace each `upsertGroup(...)` toggle with `markPayment(gid, cid, mid, mode, note?, paidDate?)` or `unmarkPayment(gid, cid, mid)`. The screen previously read `group.cycles[i].payments[j].paid`; now it must call `listPayments(gid, cid)` once on focus and map to a `Map<memberId, Payment>` for render.
       - `CycleReceiptScreen.tsx`: replace `group.cycles[i].payments` read with `listPayments(gid, cid)` on mount/focus.
       - `MemberDetailScreen.tsx`: replace `group.cycles` read with `listCycles(gid)` on mount.

    4. **Drop LINK-01:**
       - Delete `src/screens/MemberPublicViewScreen.tsx`.
       - In `src/navigation/AppNavigator.tsx`, remove the `MemberPublicView` route registration + any `linking` config entry for `chitti://member/:token`. Leave `chitti://join/...` intact (Phase 5 uses it).
       - Grep the repo for `memberTokens` + `getGroupByMemberToken` + `saveMemberToken` + `chitti://member/` and remove any remaining references.
       - Note: `LINK-01` resolution is recorded in this plan's SUMMARY.md (no separate task).

    5. Throughout: never import `firebase/firestore` directly in any screen; only via the storage barrel.

    6. Run `npx tsc --noEmit` after each screen rewire — fix-as-you-go beats fix-at-end.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | tee /tmp/tsc-all.log; test ! -s /tmp/tsc-all.log && node -e "const fs=require('fs');if (fs.existsSync('src/lib/firestore.ts')){console.error('firestore.ts not deleted');process.exit(1)};if (fs.existsSync('src/screens/MemberPublicViewScreen.tsx')){console.error('MemberPublicViewScreen not deleted');process.exit(1)};const nav=fs.readFileSync('src/navigation/AppNavigator.tsx','utf8');if (nav.includes('MemberPublicView')||nav.includes('memberTokens')||nav.includes('chitti://member/')){console.error('nav still references removed deep link');process.exit(1)};const barrel=fs.readFileSync('src/storage/index.ts','utf8');for (const s of ['groupsForUser','markPayment','unmarkPayment','upsertCycle','listPayments','listCycles','listAudit','__demoMode','myPhone']) if(!barrel.includes(s)){console.error('barrel missing '+s);process.exit(1)};console.log('ok')" && node -e "const fs=require('fs');const {execSync}=require('child_process');const out=execSync('grep -rEln \"from .\\\\.\\\\./lib/firestore\" src 2>/dev/null || true').toString();if (out.trim()){console.error('still importing deleted firestore.ts: '+out);process.exit(1)};const direct=execSync('grep -rEln \"from .firebase/firestore.\" src/screens 2>/dev/null || true').toString();if (direct.trim()){console.error('screens import firebase/firestore directly: '+direct);process.exit(1)};console.log('ok')" && npm test --silent</automated>
  </verify>
  <acceptance_criteria>
    - tsc --noEmit exits 0 across entire repo
    - `src/lib/firestore.ts` does not exist
    - `src/screens/MemberPublicViewScreen.tsx` does not exist
    - `src/navigation/AppNavigator.tsx` contains no `MemberPublicView`, `memberTokens`, or `chitti://member/` strings
    - No file under `src/screens/` imports from `'firebase/firestore'` directly
    - No file imports from `'../lib/firestore'` anywhere in `src/`
    - `src/storage/index.ts` exports the full barrel API listed in <interfaces>
    - `npm test` passes (all existing unit tests + new storage-transactions test + Wave 0 emulator smoke)
    - SUMMARY.md (when written at end) records LINK-01 as resolved-by-removal
  </acceptance_criteria>
  <done>All screens compile against the new granular API; legacy single-writer + LINK-01 deep link gone; barrel routes demo vs real cleanly.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client→Firestore | client may issue arbitrary writes; only firestore.rules can prevent — but this plan ships rules-permissive stub (Wave 3 locks down) |
| screens→storage barrel | screens are untrusted-by-discipline; if they touch `firebase/firestore` directly the audit guarantee breaks |
| storage helper→audit helper | appendAudit must be invoked inside the SAME runTransaction as the data write |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-01 | Tampering | storage write helper bypassing audit | mitigate | TypeScript signature `appendAudit(tx: Transaction, ...)` forces tx pass-through; reviewer greps every new `runTransaction` block for a `appendAudit(tx,` line |
| T-02-02 | Tampering | screens importing firebase/firestore directly | mitigate | grep gate in Task 3 verify; barrel is single boundary |
| T-02-03 | Repudiation | hard-delete of group wipes audit trail | mitigate | adopt soft-delete via archiveGroup (researcher rec #1, additional locked decision); audit log persists in /audit subcollection |
| T-02-04 | Information Disclosure | legacy public deep link chitti://member/:token leaks group data unauth | mitigate | DROP LINK-01 — delete MemberPublicViewScreen, memberTokens helpers, route entry |
| T-02-05 | Tampering | concurrent payment writes from two devices | mitigate | runTransaction wraps read-before/write-after — last writer either retries or sees conflict |
| T-02-06 | Tampering | toasts/console.log inside transaction body retry on contention | accept | code review checks transaction bodies for side effects (Pitfall H); this plan documents in the SUMMARY |
</threat_model>

<verification>
- `tsc --noEmit` exits 0
- `npm test` exits 0 (unit suites including `storage-transactions`)
- `npm run test:rules` still exits 0 (Wave 0 smoke unaffected)
- No `from '../lib/firestore'` or direct `firebase/firestore` import in any screen
- No `MemberPublicView`, `memberTokens`, `chitti://member/` references anywhere in `src/`
- `src/lib/firestore.ts` deleted
</verification>

<success_criteria>
After this plan, an executor opening any screen sees only barrel imports for data; every mutation goes through a transactional + audited path; deleting a group leaves its audit log intact on disk.
</success_criteria>

<output>
After completion, create `.planning/phases/02-multi-user-data-model-security/02-02-types-storage-audit-and-screen-rewires-SUMMARY.md` recording: types changed, audit helper API, screen rewires (one bullet each), LINK-01 resolved-by-removal, soft-delete policy adoption, and any deviations from the patterns in RESEARCH.md.
</output>
