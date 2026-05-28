---
phase: 02-multi-user-data-model-security
plan: 05
type: execute
wave: 4
depends_on: [02-02, 02-04]
files_modified:
  - tests/audit.test.ts
  - src/screens/GroupDetailScreen.tsx
  - src/screens/PaymentTrackingScreen.tsx
autonomous: true
requirements: [SOC-03]
must_haves:
  truths:
    - "Every storage mutation (createGroup, updateGroup, archiveGroup, restoreGroup, upsertCycle, markPayment, unmarkPayment) writes a matching audit event with the correct action constant"
    - "The GroupDetail 'Activity' tab renders a chronological list of audit events for the group, fetched via storage.listAudit(gid)"
    - "PaymentTrackingScreen shows a 'marked by {actorName} · {time}' pill on each paid payment row, derived from payment.markedByUid + memberMeta lookup"
    - "If data write succeeds but audit write fails (or vice versa) Wave 1's runTransaction guarantees the whole tx aborts — proven by an emulator test that injects a rules-denial on the audit doc"
  artifacts:
    - path: "tests/audit.test.ts"
      provides: "integration tests asserting per-action audit emission + tx atomicity"
    - path: "src/screens/GroupDetailScreen.tsx"
      provides: "Activity tab wired to storage.listAudit(gid)"
    - path: "src/screens/PaymentTrackingScreen.tsx"
      provides: "marked-by pill on paid rows"
  key_links:
    - from: "storage helpers (Wave 1)"
      to: "groups/{gid}/audit/*"
      via: "appendAudit(tx, ...) inside runTransaction"
      pattern: "appendAudit\\(tx"
    - from: "GroupDetail Activity tab"
      to: "storage.listAudit(gid)"
      via: "useFocusEffect fetch on mount"
      pattern: "listAudit"
    - from: "PaymentTrackingScreen paid row"
      to: "memberMeta[markedByUid].name + payment.paidDate"
      via: "pill component render"
      pattern: "markedByUid"
tags: [audit, ui-wire, soc-03, integration-tests]
---

<objective>
Verify the audit-log discipline established in Wave 1 actually fires the right `action` constant for every mutation, and wire the existing GroupDetail "Activity" tab UI + PaymentTracking "marked by …" pill to live audit/payment data. This wave is verification + UI wire-up — no new helpers are introduced (Wave 1 already shipped `appendAudit`).

Purpose: SOC-03's "readable by all members" promise + "marked by … at …" pill requirement land here. Without this wave the audit data is on disk but invisible to users, and the integration is only proven by Wave 1's unit-level transaction-mocking.
Output: tests/audit.test.ts proves per-action emission + tx atomicity; GroupDetail + PaymentTracking show audit data.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/02-multi-user-data-model-security/02-CONTEXT.md
@.planning/phases/02-multi-user-data-model-security/02-RESEARCH.md
@src/storage/groups.ts
@src/storage/cycles.ts
@src/storage/payments.ts
@src/storage/audit.ts
@src/lib/audit.ts
@tests/_helpers.ts
@src/screens/GroupDetailScreen.tsx
@src/screens/PaymentTrackingScreen.tsx
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: tests/audit.test.ts — integration tests for per-action emission + transaction atomicity</name>
  <files>tests/audit.test.ts, package.json</files>
  <read_first>
    - src/lib/audit.ts (appendAudit signature)
    - src/storage/groups.ts, cycles.ts, payments.ts (every call site of appendAudit)
    - tests/_helpers.ts (setupTestEnv, seedGroup, FOREMAN/MEMBER)
    - 02-RESEARCH.md §"Validation Architecture" table row "(helper) appendAudit writes correctly inside transaction"
    - 02-RESEARCH.md §"Pitfall H" + §"Pitfall G"
  </read_first>
  <behavior>
    For each mutation function on the storage layer, after a successful call, exactly one audit document MUST appear in groups/{gid}/audit/* with the documented action:

    | Storage call | Expected `audit.action` |
    |---|---|
    | createGroup | 'group.created' |
    | updateGroup(..., 'member.added') | 'member.added' |
    | updateGroup(..., 'settings.changed') | 'settings.changed' |
    | archiveGroup | 'group.archived' |
    | restoreGroup | 'group.restored' |
    | upsertCycle(conducted=false) | 'cycle.created' |
    | upsertCycle(conducted=true, winnerId set) | 'cycle.conducted' |
    | markPayment | 'payment.marked' |
    | unmarkPayment | 'payment.unmarked' |
    | claimPhoneAndReconcile (member.activated) | 'member.activated' (covered by Wave 2 claim-phone.test.ts; out of scope here) |

    Each audit doc MUST have:
      - `actorUid` matching `auth().currentUser.uid` (mocked to FOREMAN.uid in tests)
      - `timestamp` resolves to a real Firestore Timestamp (NOT undefined, NOT a client Date) — proves serverTimestamp() landed (Pitfall G)
      - `id` matches the doc's path-final id
      - `before`/`after` present where applicable

    Atomicity test:
      - Seed a group; call markPayment as FOREMAN; inject a rule-denial on `audit/{anyId}` writes via a sentinel rules deployment OR by mocking the audit doc path to a forbidden path (e.g., via env.withSecurityRulesDisabled false on a custom rule that denies audit writes); assert markPayment throws AND the payment doc was NOT written either — proves the whole tx aborted (Pitfall 11)
      - Simpler approach if rule-injection is infeasible: monkeypatch `appendAudit` to throw inside the tx body, then assert markPayment promise rejects AND `listPayments(gid, cid)` returns no entry for that memberId

    Use the emulator via `firebase emulators:exec`; run under `npm run test:rules` (extend the script if needed to include `tests/audit.test.ts`).
  </behavior>
  <action>
    1. Create `tests/audit.test.ts` with one describe block per storage mutation listed in behavior table.

    2. Test pattern (per mutation):
       ```
       beforeEach: seedGroup with foremanUid=FOREMAN.uid; jest.mock 'src/lib/firebase' to point at test env Firestore; jest.mock '@react-native-firebase/auth' to return FOREMAN.uid
       it: invoke storage helper; await; query groups/{gid}/audit; assert one new doc with expected action; assert timestamp is a Firestore Timestamp (instance of Timestamp); assert actorUid === FOREMAN.uid
       ```

    3. Atomicity test (one describe block 'transaction atomicity'):
       - jest.mock `src/lib/audit` so `appendAudit` throws `new Error('injected audit failure')` on call
       - Invoke `markPayment(gid, cid, mid, 'upi')` — assert it rejects
       - Read groups/{gid}/cycles/{cid}/payments/{mid} — assert it does not exist (or is unchanged from pre-state)

    4. Update package.json `test:rules` script to include `tests/audit.test.ts` in the jest glob. Pattern: `firebase emulators:exec --only firestore "jest --testPathPattern='tests/(firestore-rules|claim-phone|audit)\\.test\\.ts'"`.
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');if (!fs.existsSync('tests/audit.test.ts')){console.error('missing');process.exit(1)};const t=fs.readFileSync('tests/audit.test.ts','utf8');for (const a of ['group.created','member.added','settings.changed','group.archived','group.restored','cycle.created','cycle.conducted','payment.marked','payment.unmarked','transaction atomicity','injected audit failure']) if(!t.includes(a)){console.error('audit.test.ts missing '+a);process.exit(1)};const p=JSON.parse(fs.readFileSync('package.json','utf8'));if (!p.scripts['test:rules'].includes('audit')){console.error('test:rules does not include audit.test.ts');process.exit(1)};console.log('ok')" && npm run test:rules</automated>
  </verify>
  <acceptance_criteria>
    - tests/audit.test.ts exists and asserts the action constant for each of 9 mutation cases
    - At least one assertion per test verifies the audit doc's `timestamp` is a Firestore Timestamp instance (proves serverTimestamp() resolved server-side per Pitfall G)
    - 'transaction atomicity' describe block has at least one test that injects audit failure and proves the data write was also rolled back
    - `npm run test:rules` exits 0 with audit suite passing
  </acceptance_criteria>
  <done>Every mutation type provably writes its audit; the data + audit atomicity guarantee is locked under emulator test.</done>
</task>

<task type="auto">
  <name>Task 2: Wire GroupDetail Activity tab to listAudit; PaymentTracking marked-by pill</name>
  <files>src/screens/GroupDetailScreen.tsx, src/screens/PaymentTrackingScreen.tsx</files>
  <read_first>
    - src/screens/GroupDetailScreen.tsx (find the existing Activity tab — already designed per CONTEXT, see .planning/design-handoff/project/screens/05-06-group.jsx)
    - src/screens/PaymentTrackingScreen.tsx (find the paid row — see .planning/design-handoff/project/screens/07-payment-grid.jsx for the pill design)
    - src/storage/index.ts (barrel: listAudit, listPayments exports)
    - src/types/index.ts (AuditEvent, AuditAction, Payment shapes)
  </read_first>
  <action>
    1. **GroupDetailScreen.tsx — Activity tab wire-up:**
       - The tab UI exists from the prior session as a placeholder. Find the component (likely a sub-component or a conditional render branch keyed on a `tab` state).
       - On focus (use `useFocusEffect` from `@react-navigation/native` if not already present), call `await listAudit(gid)` from `'../storage'` and store result in component state.
       - Render the list as `<FlatList data={auditEvents} renderItem={...}>` showing per-row: an icon mapped from `event.action` (e.g., `cycle.conducted` → trophy; `payment.marked` → check; `member.added` → person-plus), a one-line human label (e.g., `${actorName(event.actorUid)} marked payment for ${memberName(event.memberId)}`), and the formatted timestamp.
       - Use `memberMeta` (from the loaded group doc) to resolve `actorUid → name`. If actor not in memberMeta and actorUid === 'system', show 'System'. Else fallback to `actorUid` short prefix.
       - Demo mode: `storage.listAudit(gid)` returns `[]` in demo (per Wave 1 barrel). Render an empty-state row "Activity log not available in demo mode" — DO NOT crash on empty array.
       - Order events newest-first (listAudit returns desc by timestamp already).

    2. **PaymentTrackingScreen.tsx — marked-by pill:**
       - Existing screen reads payment rows (after Wave 1 rewire, via `listPayments(gid, cid)` returning `Payment[]`).
       - For each row where `payment.paid === true`:
         - Resolve `markedByUid` → name via the loaded group's `memberMeta` (find the entry whose `.uid === markedByUid`); if not found, fallback to "Foreman" when `markedByUid === group.foremanUid`, else the short uid prefix.
         - Format `payment.paidDate` as `'h:mm a · MMM d'` (relative if within 24h, else date)
         - Render a small pill below the row: `<View style={pill}><Text>marked by {actorName} · {timeLabel}</Text></View>` per the design handoff prototype
       - If `payment.paid === false`: do NOT render the pill
       - Demo mode: `markedByUid` field will be undefined on demo seeds (Wave 5 plan 02-06 may or may not add it — gracefully no-render if undefined)

    3. Visual styling: match the design tokens in `src/lib/theme.ts`. Pill background = `theme.colors.surfaceMuted` (or equivalent neutral); text uses `theme.typography.caption`. Match the existing pill style if one exists for another feature; if not, create a small `PaymentMarkedPill` component inline.

    4. Do not add new test files — this is UI wire-up; visual verification is part of Wave 5 demo smoke + Wave 7 end-to-end.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | grep -E "GroupDetail|PaymentTracking" | tee /tmp/tsc-ui.log; test ! -s /tmp/tsc-ui.log && node -e "const fs=require('fs');const gd=fs.readFileSync('src/screens/GroupDetailScreen.tsx','utf8');if (!gd.includes('listAudit')){console.error('GroupDetail missing listAudit');process.exit(1)};const pt=fs.readFileSync('src/screens/PaymentTrackingScreen.tsx','utf8');if (!pt.includes('markedByUid')){console.error('PaymentTracking missing markedByUid');process.exit(1)};if (!pt.match(/marked by/i)){console.error('PaymentTracking missing marked-by pill text');process.exit(1)};console.log('ok')" && npm test --silent</automated>
  </verify>
  <acceptance_criteria>
    - GroupDetailScreen.tsx imports `listAudit` from `'../storage'` and fetches it inside a `useFocusEffect`
    - Activity tab renders a FlatList over AuditEvent[]; each row shows action + actor + timestamp; demo path renders empty-state row, doesn't crash
    - PaymentTrackingScreen.tsx renders a "marked by … · …" pill below each `paid === true` row, resolving actor name from group.memberMeta or falling back gracefully
    - `tsc --noEmit` clean
    - `npm test` exits 0 (no UI snapshot regressions; if there were existing snapshot tests they pass or are updated)
  </acceptance_criteria>
  <done>SOC-03's "readable by all members" + "marked by … at …" UI is live and bound to real audit/payment data.</done>
</task>

</tasks>

<threat_model>
## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-21 | Repudiation | a mutation lands but its audit silently doesn't | mitigate | tests/audit.test.ts asserts per-action audit emission; tx atomicity test proves either both land or neither does |
| T-02-22 | Information Disclosure | audit pill leaks actor identity to wrong member | accept | by design — audit log "readable by all members" per CONTEXT + REQUIREMENTS SOC-03 |
| T-02-23 | Tampering | demo audit fakery confuses real-flow expectations | accept | per additional locked decision #3 — demo skips audit; UI shows empty-state row |
</threat_model>

<verification>
- npm run test:rules exits 0 (incl. audit.test.ts)
- tsc --noEmit exits 0
- GroupDetail Activity tab + PaymentTracking pill render in EAS dev build (visual — Wave 7 smoke)
</verification>

<success_criteria>
A member opens GroupDetail → Activity tab and sees a chronological log of what happened in their group, with each event attributed to a name + timestamp. A member viewing a paid payment row sees who marked it and when.
</success_criteria>

<output>
After completion, create `.planning/phases/02-multi-user-data-model-security/02-05-audit-integration-and-activity-tab-SUMMARY.md` recording: per-action test counts, atomicity proof, UI components added/changed, any deviation from the design handoff.
</output>
