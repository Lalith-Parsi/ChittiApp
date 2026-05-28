---
phase: 02-multi-user-data-model-security
plan: 03
type: execute
wave: 2
depends_on: [02-02]
files_modified:
  - src/lib/AuthContext.tsx
  - tests/auth-context.test.ts
  - tests/claim-phone.test.ts
  - tests/_helpers.ts
  - package.json
autonomous: true
requirements: [DATA-01]
must_haves:
  truths:
    - "On first sign-in (RNFirebase onAuthStateChanged with phoneNumber), AuthContext writes phoneIndex/{e164} = { uid, claimedAt }"
    - "After phoneIndex claim succeeds, every group with memberPhones containing the user's E.164 phone has the user's uid appended to memberUids and memberMeta[matchingMemberId].uid + .status='active' set"
    - "Phone-claim is idempotent: a re-run with the same uid is a no-op; a different uid claiming an existing phone fails gracefully (warn + return, do not crash)"
    - "Reconciliation runs inside runTransaction per group so memberUids backfill + appendAudit('member.activated') land atomically"
    - "Web/demo branch is unaffected — claim is skipped on Platform.OS === 'web' / __demoMode"
  artifacts:
    - path: "src/lib/AuthContext.tsx"
      provides: "exported module-scope claimPhoneAndReconcile(uid, e164); invoked fire-and-forget from onAuthStateChanged"
    - path: "tests/auth-context.test.ts"
      provides: "extended with claimPhone mock test (asserts invocation on phone sign-in)"
    - path: "tests/claim-phone.test.ts"
      provides: "emulator integration test: happy-path + idempotency + different-uid conflict"
    - path: "tests/_helpers.ts"
      provides: "shared rules-unit-testing helpers (seedGroup, dbAs, FOREMAN/MEMBER/STRANGER)"
  key_links:
    - from: "AuthContext.onAuthStateChanged"
      to: "phoneIndex/{e164}"
      via: "runTransaction tx.set with phone_number from auth user"
      pattern: "phoneIndex"
    - from: "AuthContext.claimPhoneAndReconcile"
      to: "groups.memberUids + memberMeta + audit"
      via: "runTransaction per matched group + appendAudit('member.activated')"
      pattern: "member.activated"
tags: [auth, phone-claim, reconciliation, firestore-transactions]
---

<objective>
Wire the phone-claim flow into AuthContext so a user who signs in with a phone that a foreman previously added (in memberPhones[]) automatically sees the group on their Home. This is the mechanism that makes the multi-user "leader-adds-Ravi-by-phone-Tuesday; Ravi-installs-Friday-and-sees-the-chit" promise work without manual approval.

Purpose: Without this, DATA-01 ("two accounts see the same group") cannot ship — the data is shaped right (Wave 1) but no member uid ever lands in memberUids[], so no member sees any group.
Output: AuthContext.claimPhoneAndReconcile + mock-based unit test + emulator integration test.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/02-multi-user-data-model-security/02-CONTEXT.md
@.planning/phases/02-multi-user-data-model-security/02-RESEARCH.md
@src/lib/AuthContext.tsx
@tests/auth-context.test.ts
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add claimPhoneAndReconcile to AuthContext + invoke from onAuthStateChanged</name>
  <files>src/lib/AuthContext.tsx</files>
  <read_first>
    - src/lib/AuthContext.tsx (current onAuthStateChanged effect; __demoMode + IS_WEB branches)
    - 02-RESEARCH.md §"Example D" (lines ~950-1031 — full claimPhoneAndReconcile implementation)
    - 02-RESEARCH.md §"Pattern 4" (appendAudit signature used inside reconciliation tx)
    - 02-RESEARCH.md §"Pitfall H" (no toasts/console.log inside transaction body — transactions retry)
    - src/lib/audit.ts (Wave 1)
    - src/storage/groups.ts (Wave 1 — for the appendAudit pattern reference)
  </read_first>
  <behavior>
    Happy path:
      - User signs in via OTP; onAuthStateChanged fires with user.phoneNumber === '+919876543210' and user.uid === 'newUid'
      - phoneIndex/+919876543210 does NOT exist beforehand
      - Group g1 has memberPhones=['+919876543210', '+919812345678'], memberUids=[foremanUid], memberMeta['m-ravi'] = {phone: '+919876543210', status: 'pending', ...}
    After claimPhoneAndReconcile('newUid', '+919876543210'):
      - phoneIndex/+919876543210 doc exists with { uid: 'newUid', claimedAt: <serverTimestamp> }
      - groups/g1 memberUids === [foremanUid, 'newUid']
      - groups/g1 memberMeta['m-ravi'].uid === 'newUid' AND memberMeta['m-ravi'].status === 'active'
      - One audit event with action='member.activated' exists in groups/g1/audit
    Idempotency:
      - Re-run with same (uid, e164): phoneIndex tx sees existing entry with same uid → returns early (no-op); per-group loop sees `data.memberUids.includes('newUid')` → early-return inside tx, no audit event written
    Conflict:
      - phoneIndex/+919876543210 pre-exists with a DIFFERENT uid: claimPhoneAndReconcile catches the inner throw with message `'phone-already-claimed-by-different-uid'`, emits ONE console.warn outside the tx, returns gracefully (no throw, no group changes)
    Skip:
      - When IS_WEB is true, onAuthStateChanged listener does not call claimPhoneAndReconcile (existing IS_WEB short-circuit preserved)
  </behavior>
  <action>
    Add to `src/lib/AuthContext.tsx` at module scope (NOT inside the Provider component):

    `export async function claimPhoneAndReconcile(uid: string, e164: string): Promise<void> { ... }`

    Implementation MUST mirror RESEARCH §"Example D" (lines ~959-1014) with one mandatory addition: the per-group reconciliation transaction MUST include an `appendAudit(tx, gid, { action: 'member.activated', actorRole: 'system', before: { memberMeta: data.memberMeta, memberUids: data.memberUids }, after: { memberMeta: newMeta, memberUids: newUids } })` call. The research version elided this for brevity (line 1011 `// (omitted here for brevity ...)`). Do NOT elide.

    Imports to add to AuthContext.tsx (top of file with existing imports):
      - `import { doc, runTransaction, query, where, collection, getDocs, serverTimestamp } from 'firebase/firestore';`
      - `import { db } from './firebase';`
      - `import { appendAudit } from './audit';`

    Step-1 phoneIndex tx body (inside `runTransaction(db, async (tx) => { ... })`):
      - `const ref = doc(db, 'phoneIndex', e164);`
      - `const snap = await tx.get(ref);`
      - If `snap.exists()` and `snap.data().uid === uid`: return (idempotent same-uid)
      - If `snap.exists()` and `snap.data().uid !== uid`: `throw new Error('phone-already-claimed-by-different-uid');`
      - Otherwise: `tx.set(ref, { uid, claimedAt: serverTimestamp() });`

    Catch around step 1:
      - If `e.message === 'phone-already-claimed-by-different-uid'`: `console.warn('[auth] phone already claimed by different uid; ignoring claim attempt');` then `return;` — do NOT rethrow
      - Other errors: rethrow (let upstream `.catch` log)

    Step-2 reconciliation (OUTSIDE the phoneIndex tx, after step 1 succeeds):
      - `const q = query(collection(db, 'groups'), where('memberPhones', 'array-contains', e164));`
      - `const snap = await getDocs(q);` — if empty, return
      - For each `groupSnap` of `snap.docs`:
        - `const matchingMemberId = Object.entries(groupSnap.data().memberMeta ?? {}).find(([, m]: [string, any]) => m.phone === e164)?.[0];`
        - One `runTransaction(db, async (tx) => { ... })` per group:
          - `const cur = await tx.get(doc(db, 'groups', gid));`
          - If `!cur.exists()`: return
          - `const data = cur.data();`
          - If `data.memberUids?.includes(uid)`: return (idempotent)
          - `const newUids = [...(data.memberUids ?? []), uid];`
          - `const newMeta = { ...(data.memberMeta ?? {}) };`
          - If `matchingMemberId && newMeta[matchingMemberId]`: `newMeta[matchingMemberId] = { ...newMeta[matchingMemberId], uid, status: 'active' };`
          - `tx.update(doc(db, 'groups', gid), { memberUids: newUids, memberMeta: newMeta });`
          - `appendAudit(tx, gid, { action: 'member.activated', actorRole: 'system', before: { memberMeta: data.memberMeta, memberUids: data.memberUids }, after: { memberMeta: newMeta, memberUids: newUids } });`

    Update the existing `useEffect` block that calls `auth().onAuthStateChanged`:
      - Keep `if (IS_WEB) { setLoading(false); return; }` intact
      - After `setLoading(false)` inside the listener body, ADD:
        ```
        if (u?.phoneNumber) {
          claimPhoneAndReconcile(u.uid, u.phoneNumber).catch(e =>
            console.warn('[auth] claim/reconcile failed', e)
          );
        }
        ```
      - Call is fire-and-forget — UI never blocks on reconciliation per RESEARCH

    Transaction discipline (Pitfall H):
      - No `console.log` on the success path inside any transaction body
      - No toast / setState / analytics calls inside tx bodies
      - The single allowed `console.warn` lives OUTSIDE the tx, in the conflict catch (and one OUTSIDE in the outer .catch attached to onAuthStateChanged)

    Chunking:
      - One `runTransaction` per matched group (not a single batch) — atomicity is per-group; RESEARCH explicitly endorses this in §"Example D" loop and §"Don't Hand-Roll"

    Make claimPhoneAndReconcile importable from tests: ensure it is `export async function ...` at module scope (not an inner closure of the Provider).
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | grep -i AuthContext | tee /tmp/tsc-auth.log; test ! -s /tmp/tsc-auth.log && node -e "const fs=require('fs');const ac=fs.readFileSync('src/lib/AuthContext.tsx','utf8');for (const s of ['claimPhoneAndReconcile','phoneIndex','runTransaction','appendAudit','member.activated','phone-already-claimed-by-different-uid','array-contains']) if(!ac.includes(s)){console.error('AuthContext missing '+s);process.exit(1)};if (!/export\\s+async\\s+function\\s+claimPhoneAndReconcile/.test(ac)){console.error('claimPhoneAndReconcile not exported at module scope');process.exit(1)};const txBodies=ac.split('runTransaction').slice(1);for (const body of txBodies){const closing=body.indexOf('});');const inside=body.slice(0,closing);if (inside.match(/console\\.log/)||inside.match(/Toast/)){console.error('side effect inside runTransaction body');process.exit(1)}};console.log('ok')"</automated>
  </verify>
  <acceptance_criteria>
    - tsc --noEmit clean
    - `claimPhoneAndReconcile` exported at module scope of `src/lib/AuthContext.tsx`
    - Step 1 (phoneIndex claim) uses `runTransaction`, with snap.exists() branch for same-uid (return) and different-uid (throw + outer catch + warn + return)
    - Step 2 (reconciliation) does one `runTransaction` per matched group; inside tx calls `appendAudit(tx, gid, { action: 'member.activated', actorRole: 'system', ... })`
    - `onAuthStateChanged` listener invokes claimPhoneAndReconcile fire-and-forget with `.catch(e => console.warn(...))`
    - IS_WEB short-circuit preserved
    - No `console.log` or `Toast` inside any transaction body
  </acceptance_criteria>
  <done>AuthContext claims phoneIndex + reconciles memberUids on first sign-in, idempotently and atomically per group.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Extract shared test helpers + extend auth-context test + create claim-phone emulator integration test</name>
  <files>tests/_helpers.ts, tests/auth-context.test.ts, tests/claim-phone.test.ts, tests/firestore-rules.test.ts, package.json</files>
  <read_first>
    - tests/auth-context.test.ts (current shape — uses firebase-stub mock from Phase 1 plan 01-02)
    - tests/firestore-rules.test.ts (Wave 0 — copy seedGroup/dbAs/dbUnauth/FOREMAN/MEMBER/STRANGER helpers into tests/_helpers.ts)
    - tests/__mocks__/firebase-stub.js (existing JS-SDK ESM mock)
    - 02-RESEARCH.md §"Validation Architecture" → "Phase Requirements → Test Map" row "claim-phone" + "auth-context"
    - package.json (`test:rules` script)
  </read_first>
  <behavior>
    tests/_helpers.ts:
      - Exports an async `setupTestEnv()` returning `{ env, FOREMAN, MEMBER, STRANGER, seedGroup, dbAs, dbUnauth }`
      - FOREMAN = { uid: 'foreman-uid', phone: '+919000000001' }
      - MEMBER = { uid: 'member-uid', phone: '+919000000002' }
      - STRANGER = { uid: 'stranger-uid', phone: '+919000000099' }
      - seedGroup(env, opts) writes a group doc via env.withSecurityRulesDisabled (same shape as RESEARCH §"Example B")

    tests/auth-context.test.ts (extended — mock-based, NOT emulator):
      - New describe block 'claim phone on first sign-in':
        - Mock onAuthStateChanged callback firing with `{ uid: 'u1', phoneNumber: '+919000000001' }`
        - jest.spyOn the exported `claimPhoneAndReconcile` (or jest.mock the AuthContext module) to assert it is called with `('u1', '+919000000001')`
      - New test 'IS_WEB skips claim': when IS_WEB is set, listener path does not reach claimPhoneAndReconcile

    tests/claim-phone.test.ts (NEW — runs via emulator under `npm run test:rules`):
      - beforeAll: `initializeTestEnvironment({ projectId: 'chitti-claim-test', firestore: { rules: '<allow-all stub for this test only>', host: '127.0.0.1', port: 8080 } })` OR import the env from _helpers.ts
      - For each test: `env.clearFirestore()`, seed group via withSecurityRulesDisabled
      - Test A (happy path): seed group g1 with memberPhones=[FOREMAN.phone, MEMBER.phone], memberUids=[FOREMAN.uid], memberMeta={ 'm-foreman': {phone: FOREMAN.phone, uid: FOREMAN.uid, status: 'active'}, 'm-member': {phone: MEMBER.phone, status: 'pending'} }; jest.mock `src/lib/firebase` to return the test env's authenticatedContext(MEMBER.uid, { phone_number: MEMBER.phone }).firestore() as `db`; jest.mock `@react-native-firebase/auth` to return `{ default: () => ({ currentUser: { uid: MEMBER.uid, phoneNumber: MEMBER.phone } }) }`; call `await claimPhoneAndReconcile(MEMBER.uid, MEMBER.phone)`; assert phoneIndex/+919000000002 exists with uid=MEMBER.uid; groups/g1 memberUids includes MEMBER.uid; memberMeta['m-member'].uid === MEMBER.uid; memberMeta['m-member'].status === 'active'; at least one doc exists in groups/g1/audit with action='member.activated'
      - Test B (idempotency): pre-seed phoneIndex with MEMBER.uid; re-run claimPhoneAndReconcile; assert memberUids has no duplicate; count audit docs unchanged from baseline
      - Test C (conflict): pre-seed phoneIndex with a different uid ('other-uid'); run claimPhoneAndReconcile(MEMBER.uid, MEMBER.phone); assert it does NOT throw; assert group g1 memberUids unchanged; assert `console.warn` spy was called once
  </behavior>
  <action>
    1. Create `tests/_helpers.ts` and migrate `FOREMAN`, `MEMBER`, `STRANGER`, `seedGroup`, `dbAs`, `dbUnauth` from `tests/firestore-rules.test.ts` (Wave 0). Update `tests/firestore-rules.test.ts` to import from `./_helpers`. Keep the env initialization in `_helpers.ts` via an exported `setupTestEnv()` factory so each test file gets its own env (using a unique projectId).

    2. Extend `tests/auth-context.test.ts` per behavior block. Use the existing firebase-stub for jest.mock; spy on the exported claimPhoneAndReconcile (you may need to use `jest.mock('../src/lib/AuthContext', () => ({ ...jest.requireActual('../src/lib/AuthContext'), claimPhoneAndReconcile: jest.fn() }))`).

    3. Create `tests/claim-phone.test.ts` with the three scenarios above. Test C must spy on `console.warn` via `jest.spyOn(console, 'warn').mockImplementation(() => {})` in `beforeEach` and restore in `afterEach`.

    4. Update `package.json` `test:rules` script to glob both rules + claim tests. Recommended pattern: `"test:rules": "firebase emulators:exec --only firestore \"jest --testPathPattern='tests/(firestore-rules|claim-phone)\\\\.test\\\\.ts'\""`. Confirm the regex works on Windows PowerShell (escape if needed).

    5. If the firebase-stub does not yet expose `runTransaction`, `query`, `where`, `collection`, `getDocs`, `serverTimestamp`: extend `tests/__mocks__/firebase-stub.js` with stubs that proxy to the actual emulator-backed Firestore instance (jest mocking is bypassed in claim-phone.test.ts which uses the real test env). For auth-context.test.ts the stub may continue returning jest.fn() shims — the assertion only checks invocation shape.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | grep -E "tests/(auth-context|claim-phone|_helpers)" | tee /tmp/tsc-tests.log; test ! -s /tmp/tsc-tests.log && node -e "const fs=require('fs');for (const f of ['tests/_helpers.ts','tests/auth-context.test.ts','tests/claim-phone.test.ts']) {if (!fs.existsSync(f)) {console.error('missing '+f);process.exit(1)}};const ac=fs.readFileSync('tests/auth-context.test.ts','utf8');if (!ac.includes('claimPhoneAndReconcile')) {console.error('auth-context.test.ts not extended');process.exit(1)};const cp=fs.readFileSync('tests/claim-phone.test.ts','utf8');for (const s of ['member.activated','idempot','phoneIndex','console.warn']) if(!cp.toLowerCase().includes(s.toLowerCase())){console.error('claim-phone.test.ts missing '+s);process.exit(1)};const h=fs.readFileSync('tests/_helpers.ts','utf8');for (const s of ['FOREMAN','MEMBER','STRANGER','seedGroup','dbAs']) if(!h.includes(s)){console.error('_helpers missing '+s);process.exit(1)};const p=JSON.parse(fs.readFileSync('package.json','utf8'));if (!p.scripts['test:rules'].includes('claim-phone')) {console.error('test:rules script does not include claim-phone');process.exit(1)};console.log('ok')" && npm test -- --testPathPattern=auth-context --bail && npm run test:rules</automated>
  </verify>
  <acceptance_criteria>
    - tests/_helpers.ts exists and exports `setupTestEnv`, `FOREMAN`, `MEMBER`, `STRANGER`, `seedGroup`, `dbAs`, `dbUnauth`
    - tests/firestore-rules.test.ts imports from ./_helpers (Wave 0's harness refactored, no duplication)
    - tests/auth-context.test.ts has at least one new test invoking `claimPhoneAndReconcile` mock and asserts call signature
    - tests/claim-phone.test.ts has three describe blocks: happy path, idempotency, different-uid conflict
    - package.json `test:rules` script invokes both `firestore-rules` and `claim-phone` files
    - `npm test -- --testPathPattern=auth-context` exits 0
    - `npm run test:rules` exits 0 (all three claim-phone tests pass against emulator)
  </acceptance_criteria>
  <done>Auth-context tests + claim-phone emulator integration tests green; the multi-user data-visibility promise is provably wired end-to-end.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| RNFirebase auth → client | the only source of truth for `auth.uid` and `phone_number`; Firebase signs the ID token |
| client → phoneIndex/{e164} | first-write-wins claim; rules (Wave 3) enforce `auth.token.phone_number == e164` |
| client → groups/{gid} memberUids | reconciliation appends the caller's uid; rules (Wave 3) enforce the caller's phone is in memberPhones |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-07 | Spoofing | attacker tries to claim someone else's phone | mitigate | phoneIndex tx checks `snap.data().uid !== uid` and bails; Wave 3 rules add `request.auth.token.phone_number == e164` requirement |
| T-02-08 | Tampering | crash between phoneIndex write and memberUids backfill leaves half-state | mitigate | each step is in its own runTransaction (atomic); re-run is idempotent — same-uid early-return at both levels |
| T-02-09 | Tampering | two devices same uid race the claim | mitigate | runTransaction retries on contention; first commit wins; second sees snap.exists() with same uid → no-op |
| T-02-10 | Repudiation | reconciliation occurs silently without audit | mitigate | appendAudit('member.activated') inside the per-group tx; provable in the audit subcollection |
| T-02-11 | DoS | foreman adds 10000 phones, claim tries 10000 group writes on sign-in | accept | totalMembers ≤ 60 per group (Phase 3 will enforce); typical user is in 1-3 groups; chunking at 500-writes-per-tx never trips in practice |
</threat_model>

<verification>
- tsc --noEmit exits 0
- npm test (unit suite incl. auth-context) exits 0
- npm run test:rules (emulator suite incl. firestore-rules + claim-phone) exits 0
- Visual check: AuthContext.tsx contains an exported module-scope `claimPhoneAndReconcile`
- Visual check: no console.log / Toast / setState inside any runTransaction body in AuthContext.tsx
</verification>

<success_criteria>
End-to-end: signing in to the emulator as a brand-new user whose phone is listed in a foreman's `memberPhones[]` results in that user's uid landing in `memberUids[]` within seconds, with a `member.activated` audit event written. Re-running the claim is a no-op.
</success_criteria>

<output>
After completion, create `.planning/phases/02-multi-user-data-model-security/02-03-phone-claim-and-auth-context-SUMMARY.md` recording: claim function signature, audit integration (the deviation from research §"Example D" that adds appendAudit), test counts (auth-context + claim-phone), and any conflicts surfaced by the emulator runs.
</output>
