---
phase: 02-multi-user-data-model-security
plan: 08
type: execute
wave: 7
depends_on: [02-02, 02-03, 02-04, 02-05, 02-06, 02-07]
files_modified:
  - tests/multi-user-smoke.test.ts
  - tests/MULTI-USER-SMOKE.md
  - .planning/phases/02-multi-user-data-model-security/02-08-end-to-end-multi-user-smoke-SUMMARY.md
autonomous: true
requirements: [DATA-01, DATA-02, DATA-03, SOC-03]
must_haves:
  truths:
    - "Two emulator users with different phones (FOREMAN + MEMBER) see the SAME group from their own auth contexts after MEMBER's phone-claim runs"
    - "Member can read the group (and its cycles, payments, audit subcollections) but cannot write to any of them — rules layer denies"
    - "Foreman can mark a payment; member sees the same payment on a fresh read; audit log records the mark with markedByUid=foremanUid"
    - "A stranger (third uid, phone not in memberPhones) cannot read the group from either context"
    - "Demo mode on web target still loads 3 seeded chits and works end-to-end (mark-payment + conduct-draw)"
  artifacts:
    - path: "tests/multi-user-smoke.test.ts"
      provides: "automated end-to-end emulator test exercising the cross-account data-visibility promise"
    - path: "tests/MULTI-USER-SMOKE.md"
      provides: "manual smoke checklist for non-automatable steps (visual EAS-dev-build verification deferred to Phase 5)"
  key_links:
    - from: "FOREMAN authenticatedContext"
      to: "MEMBER authenticatedContext"
      via: "shared group g1 in Firestore emulator + phone-claim flow"
      pattern: "memberUids"
    - from: "rules layer"
      to: "MEMBER read access"
      via: "isMember(group) phone-fallback OR uid-in-memberUids"
      pattern: "isMember"
tags: [end-to-end, smoke, multi-user, integration, data-01, data-02, data-03, soc-03]
---

<objective>
Prove the keystone of Phase 2 — that two different signed-in accounts actually see the same group, with rules enforcing who reads/writes what — via a single automated emulator test plus a documented manual smoke checklist. This is the wave that turns "every individual piece compiled and unit-tested" into "the product's whole premise is provably wired."

Purpose: Without this wave a reviewer cannot tell whether all of Phase 2 actually composes into the multi-user promise. The seven earlier waves are necessary but only collectively sufficient — this wave proves the composition.
Output: tests/multi-user-smoke.test.ts (automated under `npm run test:rules`) + tests/MULTI-USER-SMOKE.md (manual checklist for visual / EAS-dev-build verification deferred to Phase 5).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/02-multi-user-data-model-security/02-CONTEXT.md
@.planning/phases/02-multi-user-data-model-security/02-RESEARCH.md
@firestore.rules
@tests/_helpers.ts
@src/storage/index.ts
@src/lib/AuthContext.tsx
@src/storage/demo.ts
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: tests/multi-user-smoke.test.ts — automated end-to-end emulator test</name>
  <files>tests/multi-user-smoke.test.ts, package.json</files>
  <read_first>
    - 02-RESEARCH.md §"Migration Sequence (Waves)" Wave 7 (lines ~1587-1592 — test scenarios)
    - tests/_helpers.ts (FOREMAN/MEMBER/STRANGER constants, env setup)
    - tests/firestore-rules.test.ts (Wave 0 + Wave 3 — patterns for assertSucceeds/assertFails)
    - tests/claim-phone.test.ts (Wave 2 — pattern for invoking claimPhoneAndReconcile in tests)
    - src/storage/groups.ts, payments.ts (Wave 1 — helpers tested end-to-end here)
    - firestore.rules (Wave 3 — the rules that should allow/deny the actions below)
  </read_first>
  <behavior>
    Single end-to-end test file. Setup once at top:
      - initializeTestEnvironment loading firestore.rules (production rules from Wave 3)
      - FOREMAN, MEMBER, STRANGER from _helpers.ts
      - beforeEach: env.clearFirestore()

    Test 1 — "foreman creates a group; member sees it after phone-claim":
      1. As FOREMAN (authenticatedContext with uid=FOREMAN.uid, token.phone_number=FOREMAN.phone): call the storage `createGroup` helper to create group g1 with `memberPhones: [FOREMAN.phone, MEMBER.phone]`, `memberMeta: { 'm-f': {phone:FOREMAN.phone, uid:FOREMAN.uid, status:'active'}, 'm-m': {phone:MEMBER.phone, status:'pending'} }`, `foremanCommissionPct: 5, maxDiscountPct: 30, drawType: 'lottery'` etc.
      2. (Direct emulator query as MEMBER before claim — phone-fallback rules allow read): query groups where memberPhones array-contains MEMBER.phone → assert one result, matching g1
      3. Invoke `claimPhoneAndReconcile(MEMBER.uid, MEMBER.phone)` (jest.mock firebase config to point at MEMBER's auth context)
      4. (Now memberUids has MEMBER.uid): re-query as MEMBER via uid-based isMember path → still sees g1; assert g1.memberUids includes MEMBER.uid; assert g1.memberMeta['m-m'].uid === MEMBER.uid and status='active'
      5. Assert: groups/g1/audit has at least one doc with action='group.created' (from createGroup) AND one with action='member.activated' (from claim)

    Test 2 — "member cannot write but foreman can; member sees foreman's writes":
      1. Setup: g1 already exists (re-create in beforeEach or use Test 1's seed via env.withSecurityRulesDisabled)
      2. As MEMBER: attempt to set groups/g1/cycles/c1 → assertFails
      3. As FOREMAN: call upsertCycle(g1, { cycleNumber: 1, conducted: false, drawType: 'lottery', ...}) → succeeds
      4. As MEMBER: getDoc(groups/g1/cycles/c1) → succeeds, data matches
      5. As FOREMAN: call markPayment(g1, c1, 'm-m', 'upi') → succeeds
      6. As MEMBER: getDoc(groups/g1/cycles/c1/payments/m-m) → succeeds, paid:true, markedByUid:FOREMAN.uid
      7. As MEMBER: try to setDoc(groups/g1/cycles/c1/payments/m-m, {paid:false}) → assertFails

    Test 3 — "stranger cannot read":
      1. g1 exists (memberPhones doesn't include STRANGER.phone, memberUids doesn't include STRANGER.uid)
      2. As STRANGER: getDoc(groups/g1) → assertFails
      3. As STRANGER: query collection(groups) where memberPhones array-contains STRANGER.phone → returns empty (no read error, just zero results)
      4. As STRANGER: try to claim phoneIndex/FOREMAN.phone → assertFails (token mismatch)

    Test 4 — "audit log is append-only across accounts":
      1. g1 + at least 3 audit entries exist (from previous tests' setup; or seed directly)
      2. As FOREMAN: try to updateDoc(groups/g1/audit/<some-id>, {notes:'rewritten'}) → assertFails
      3. As FOREMAN: try to deleteDoc(groups/g1/audit/<some-id>) → assertFails
      4. As MEMBER: getDocs(collection(groups/g1/audit)) → succeeds with all 3+ docs returned
      5. As STRANGER: getDocs(collection(groups/g1/audit)) → assertFails

    Test 5 — "discount cap is enforced cross-account":
      1. g1 has maxDiscountPct: 30, amount: 5000, totalMembers: 20 → cap = 30000
      2. As FOREMAN: try to upsertCycle conducting cycle with discount=50000 → assertFails (rule denies)
      3. As FOREMAN: upsertCycle with discount=30000 → succeeds
      4. As MEMBER: getDoc(cycle) → sees the conducted cycle with winAmount=70000, discount=30000

    Each test asserts via `assertSucceeds()` / `assertFails()` from `@firebase/rules-unit-testing`.
  </behavior>
  <action>
    Create `tests/multi-user-smoke.test.ts` covering the five tests above.

    Implementation notes:
      - Reuse setupTestEnv from `tests/_helpers.ts`
      - For tests that invoke real storage helpers (createGroup, upsertCycle, markPayment, claimPhoneAndReconcile): jest.mock `src/lib/firebase` per test to return the target user's `env.authenticatedContext(uid, {phone_number}).firestore()`; jest.mock `@react-native-firebase/auth` to return `{ default: () => ({ currentUser: { uid, phoneNumber } }) }`. Use `jest.isolateModules` or `jest.resetModules` if test boundaries need clean module re-imports.
      - For tests that issue raw assertions (assertFails on direct doc writes): use the SDK directly with the authenticated context's firestore instance.
      - Keep the test file ≤ 250 lines total — five focused scenarios, no helper sprawl.

    Update `package.json` `test:rules` script to include this file in the glob: `firebase emulators:exec --only firestore "jest --testPathPattern='tests/(firestore-rules|claim-phone|audit|migration-script|multi-user-smoke)\\.test\\.ts'"`.
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');if (!fs.existsSync('tests/multi-user-smoke.test.ts')){console.error('missing');process.exit(1)};const t=fs.readFileSync('tests/multi-user-smoke.test.ts','utf8');for (const s of ['claimPhoneAndReconcile','assertFails','assertSucceeds','memberUids','member.activated','markedByUid','+919000000099','discount=30000','memberPhones']) {const ok=t.includes(s)||t.includes(s.replace(/=/g,': '));if (!ok){console.error('missing '+s);process.exit(1)}};const p=JSON.parse(fs.readFileSync('package.json','utf8'));if (!p.scripts['test:rules'].includes('multi-user-smoke')){console.error('test:rules glob missing multi-user-smoke');process.exit(1)};console.log('ok')" && npm run test:rules</automated>
  </verify>
  <acceptance_criteria>
    - tests/multi-user-smoke.test.ts exists with 5 test scenarios (foreman-creates-member-sees, write-deny, stranger-cannot-read, audit-append-only-cross-account, discount-cap-cross-account)
    - File invokes real storage helpers (createGroup, upsertCycle, markPayment, claimPhoneAndReconcile) — NOT only raw SDK calls
    - package.json test:rules script includes multi-user-smoke in its glob
    - `npm run test:rules` exits 0 with all five scenarios passing
    - All Phase 2 requirement IDs are covered: DATA-01 (test 1 step 4), DATA-02 (test 2 cycle subcollection write+read), DATA-03 (test 2 write-deny + test 3 read-deny + test 5 discount-cap), SOC-03 (test 4 audit append-only + read-by-member)
  </acceptance_criteria>
  <done>The multi-user promise is provably wired end-to-end against the production rules.</done>
</task>

<task type="auto">
  <name>Task 2: tests/MULTI-USER-SMOKE.md — manual checklist for visual / EAS-dev-build verification</name>
  <files>tests/MULTI-USER-SMOKE.md</files>
  <read_first>
    - 02-RESEARCH.md §"Migration Sequence (Waves)" Wave 7 (lines ~1587-1592 — semi-automated checklist note)
    - tests/multi-user-smoke.test.ts (just created in Task 1 — manual list complements the automated)
  </read_first>
  <action>
    Create `tests/MULTI-USER-SMOKE.md` as a developer-facing checklist for steps that are NOT covered by the automated emulator test and that require a real EAS dev build + physical device (deferred to Phase 5, but documented now so Phase 5 doesn't have to re-derive the list).

    Structure:

    ```markdown
    # Multi-User End-to-End Smoke — Manual Checklist

    Last verified: TBD (deferred to Phase 5 device-verification plan)

    The automated emulator suite (`tests/multi-user-smoke.test.ts`) proves the data + rules layer. This checklist covers what only a real device + real Firebase project can verify.

    ## Prerequisites
    - EAS dev build installed on physical iOS device A + Android device B
    - Two Indian phone numbers with active SIMs (different numbers)
    - Firebase Phone Auth "Phone numbers for testing" optionally configured for repeatable runs

    ## Setup
    1. Sign in on device A with phone P-A. Tap "Create new chitti". Build a 10-member chit; one of the members has phone P-B.
    2. Note the group ID from device A's GroupDetail header.

    ## Test 1 — Member sees foreman's group
    - [ ] On device B, sign in with phone P-B (first OTP)
    - [ ] HomeScreen shows the chit created on device A within ~5s of sign-in (allow time for claimPhoneAndReconcile)
    - [ ] Tap the chit; GroupDetail loads with the same data device A sees
    - [ ] Switch to Activity tab — shows 'group.created' and 'member.activated' entries

    ## Test 2 — Foreman marks payment, member sees it
    - [ ] On device A, mark payment for member P-B in cycle 1 with mode 'upi'
    - [ ] Within ~5s, on device B PaymentTracking shows the row as paid with 'marked by {Foreman name} · {time}' pill
    - [ ] On device B, attempt to tap the row to unmark — UI should disable / Alert should explain "only foreman can mark/unmark"

    ## Test 3 — UX-02 native date picker
    - [ ] On device A, Create chit → "Starting month" — verify native iOS spinner appears (not custom day grid)
    - [ ] On device B (Android), same flow — verify native Android calendar dialog

    ## Test 4 — UX-03 hardware-back interception
    - [ ] On device B (Android), open Draw screen, select a winner but don't confirm; press hardware back → "Discard draw?" Alert appears
    - [ ] Tap Discard → screen pops; tap Keep editing → stays
    - [ ] On device A (iOS), same Draw flow; swipe back from edge → confirm gestureEnabled=false (no swipe-back mid-draw) OR swipe-back triggers the discard prompt (depending on implementation choice in Wave 5)

    ## Test 5 — Demo mode on web
    - [ ] Run `npm run web` locally
    - [ ] Tap "Preview without signing in →" → demo mode loads
    - [ ] HomeScreen shows 3 seeded chits (Anna Nagar, Office Lunch, Saraswathi)
    - [ ] Open Anna Nagar; mark a payment; verify it persists during the session (lost on refresh)
    - [ ] Open Office Lunch; conduct the cycle 8 draw (all paid → draw enabled); verify dividend math
    - [ ] Try to exit demo (back button) → "Exit demo?" prompt appears

    ## Sign-off
    - Tester: _____
    - Date: _____
    - Devices: iOS _____, Android _____
    - Issues filed: _____
    ```

    The file is documentation only — no test runner picks it up. Phase 5's device-verification plan will mark items complete.
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');if (!fs.existsSync('tests/MULTI-USER-SMOKE.md')){console.error('missing');process.exit(1)};const m=fs.readFileSync('tests/MULTI-USER-SMOKE.md','utf8');for (const s of ['Test 1','Test 2','Test 3','Test 4','Test 5','Prerequisites','EAS dev build','Anna Nagar','Phase 5','claimPhoneAndReconcile']) if(!m.includes(s)){console.error('checklist missing '+s);process.exit(1)};console.log('ok')"</automated>
  </verify>
  <acceptance_criteria>
    - tests/MULTI-USER-SMOKE.md exists with 5 numbered test sections plus prerequisites + sign-off
    - Each test has explicit checkbox steps
    - File references "deferred to Phase 5 device-verification plan"
    - Web demo mode included as a separate test (covers the only platform that demo runs on)
  </acceptance_criteria>
  <done>Manual checklist documented so Phase 5 picks it up without re-derivation.</done>
</task>

<task type="auto">
  <name>Task 3: Phase 2 closeout — write SUMMARY recording UX-01 reconciliation + all locked decisions</name>
  <files>.planning/phases/02-multi-user-data-model-security/02-08-end-to-end-multi-user-smoke-SUMMARY.md</files>
  <read_first>
    - All prior plan SUMMARYs in this phase directory (when they exist after execution)
    - 02-CONTEXT.md §"UX-01 already shipped [RECONCILED]"
    - The four additional locked decisions in the planning context (soft-delete only, LINK-01 dropped, demo skips audit, permissive foreman corrections)
    - .planning/STATE.md (for the UX-01 evidence)
  </read_first>
  <action>
    Write the Phase 2 closeout SUMMARY at `.planning/phases/02-multi-user-data-model-security/02-08-end-to-end-multi-user-smoke-SUMMARY.md`. This is the "Phase 2 done" record. Content:

    1. **Wave 7 outcome:** automated 5-scenario smoke green + manual checklist documented
    2. **UX-01 reconciliation (RECONCILED, no new code in Phase 2):** Per STATE.md, the prior session shipped `Alert.alert` everywhere; `window.confirm` is grep-clean across `src/`. UX-01 is closed by reconciliation in this SUMMARY rather than by a code-producing task. Cite the STATE.md table row.
    3. **UX-02 + UX-03 code-complete; hardware verification deferred to Phase 5** — mirrors the AUTH-01/02 pattern from Phase 1.
    4. **Locked policy adoptions:**
       - Soft-delete only (additional locked decision #1): archiveGroup not hard delete; audit trail preserved; restoreGroup available
       - LINK-01 dropped (#2): MemberPublicViewScreen + memberTokens helpers removed; chitti://member/:token deep link gone
       - Demo skips audit (#3): listAudit returns []; UI empty-state row
       - Foreman cycle-corrections permissive (#4): rules allow update of conducted cycles; tightening deferred to Phase 5
    5. **Requirement coverage table:**
       | Req | Wave | Status |
       |---|---|---|
       | DATA-01 | 1, 2, 3, 7 | shipped (proven by tests/multi-user-smoke Test 1) |
       | DATA-02 | 1, 7 | shipped (subcollection writes; smoke Test 2) |
       | DATA-03 | 3, 7 | shipped (firestore.rules + comprehensive emulator suite) |
       | DATA-05 | 6 | shipped (migration script + idempotency test) |
       | SOC-03 | 1, 4, 7 | shipped (appendAudit transactional + Activity tab UI + cross-account audit test) |
       | UX-01 | — | reconciled-as-shipped (prior session) |
       | UX-02 | 5 | code-complete (hardware deferred to Phase 5) |
       | UX-03 | 5 | code-complete (hardware deferred to Phase 5) |
    6. **Phase 1 carry-forward:** Plans 01-05 + 01-06 still deferred (device verification + key rotation). Phase 2 did not close them.
    7. **Open items for Phase 3:** Group create/add-member screens already render against the new data layer (Wave 1 rewires) but Phase 3 still has to enforce GROUP-01 server-side parameter validation + GROUP-02/03 member-status transitions + GROUP-04/05 removal/leave rules.
    8. **Lessons learned section** (for RETROSPECTIVE.md aggregation): wave 1 merger of types+storage+audit+transactions was the right call (per researcher); LINK-01 cleanup was cheap (one screen, one navigator entry, two helpers) — should have been done in Phase 1 prep.

    Format: markdown with a top-of-file frontmatter `phase: 02-multi-user-data-model-security` and `plan: 08`, `wave: 7`, `closes_phase: true`. This file IS the Phase 2 closeout record.
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');const f='.planning/phases/02-multi-user-data-model-security/02-08-end-to-end-multi-user-smoke-SUMMARY.md';if (!fs.existsSync(f)){console.error('missing summary');process.exit(1)};const s=fs.readFileSync(f,'utf8');for (const k of ['UX-01','RECONCILED','LINK-01','soft-delete','DATA-01','DATA-05','SOC-03','closes_phase','Phase 5']) if(!s.includes(k)){console.error('summary missing '+k);process.exit(1)};console.log('ok')"</automated>
  </verify>
  <acceptance_criteria>
    - SUMMARY file exists with frontmatter `closes_phase: true`
    - UX-01 reconciliation documented (no new code, references STATE.md evidence)
    - All four additional locked decisions documented with their impact
    - Requirement coverage table covers all 8 phase requirement IDs
    - Phase 1 carry-forward (plans 01-05/06) explicitly noted as still-deferred
    - Phase 3 hand-off notes included
  </acceptance_criteria>
  <done>Phase 2 closeout record complete; ROADMAP.md row for Phase 2 can be marked [x] by the orchestrator.</done>
</task>

</tasks>

<threat_model>
## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-31 | (composite) | Phase 2 ships but the cross-account promise is silently broken (each piece works, integration doesn't) | mitigate | Wave 7 multi-user-smoke automated test exercises the full happy path under production rules; manual EAS-build checklist closes the device-specific gap |
</threat_model>

<verification>
- npm run test:rules exits 0 (now includes multi-user-smoke.test.ts)
- tsc --noEmit exits 0
- SUMMARY file committed
- ROADMAP.md Phase 2 row updated when orchestrator transitions
</verification>

<success_criteria>
Phase 2's keystone promise — two accounts see the same group — is proven by an automated emulator test against the production rules file. UX-01/02/03 status is honestly recorded (one shipped, two code-complete with hardware-verification deferred). All four additional locked decisions are captured in the closeout SUMMARY.
</success_criteria>

<output>
This plan's SUMMARY IS the Phase 2 closeout — Task 3 writes it. No separate SUMMARY file from the executor needed beyond what Task 3 produces.
</output>
