---
phase: 02-multi-user-data-model-security
plan: 04
type: execute
wave: 3
depends_on: [02-01, 02-02, 02-03]
files_modified:
  - firestore.rules
  - tests/firestore-rules.test.ts
autonomous: true
requirements: [DATA-03, SOC-03]
must_haves:
  truths:
    - "A stranger (not in memberUids and phone not in memberPhones) cannot read any group document"
    - "A member can read their group; a member cannot write the group, cycles, payments, or audit"
    - "Only the foreman (request.auth.uid == foremanUid) can write group/cycles/payments"
    - "audit subcollection: foreman can create (with actorUid == auth.uid); update + delete forbidden for everyone"
    - "Cycle writes are rejected server-side when discount > maxDiscountPct * amount * totalMembers / 100"
    - "drawType enum whitelist enforced server-side: only 'lottery' | 'auction' | 'manual' accepted"
    - "phoneIndex/{e164}: only the user whose auth.token.phone_number == e164 can create; update/delete forbidden"
    - "Member with claimed phone but uid not yet in memberUids can still read via phone-fallback (defense-in-depth against claim race window)"
  artifacts:
    - path: "firestore.rules"
      provides: "production rule set replacing the Wave 0 permissive stub"
    - path: "tests/firestore-rules.test.ts"
      provides: "describe.skip blocks unskipped + new tests covering every rule decision row in 02-CONTEXT"
  key_links:
    - from: "firestore.rules cycles/{cid} write"
      to: "loadGroup(gid).data.maxDiscountPct + .amount + .totalMembers"
      via: "get() cross-document read inside rule"
      pattern: "get\\(/databases"
    - from: "firestore.rules audit/{eid}"
      to: "(no path)"
      via: "allow update, delete: if false"
      pattern: "allow update, delete: if false"
tags: [security-rules, firestore, validation, audit, rbac]
---

<objective>
Replace the permissive stub `firestore.rules` from Wave 0 with the production rule set from 02-CONTEXT.md's locked rule table. Unskip every `describe.skip(...)` in `tests/firestore-rules.test.ts` and add the remaining coverage so each rule decision is exercised under the emulator.

Purpose: DATA-03 and SOC-03 ship here. Without enforced rules, the data layer's transactional discipline (Wave 1) does not defend against a hostile or buggy client.
Output: production `firestore.rules` + comprehensive rules test suite, all green under `npm run test:rules`.
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
@tests/firestore-rules.test.ts
@tests/_helpers.ts
@.planning/research/PITFALLS.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Write production firestore.rules covering groups, cycles, payments, audit, phoneIndex</name>
  <files>firestore.rules</files>
  <read_first>
    - 02-RESEARCH.md §"Example A" (lines ~621-733 — full firestore.rules ready-to-paste)
    - 02-RESEARCH.md §"Cross-document read note" (lines ~722-733 — isMember phone-fallback recommendation)
    - 02-CONTEXT.md §"Firestore security rules — production-grade" (lines ~84-106 — rule table)
    - .planning/research/PITFALLS.md (Pitfalls 2, 5, 11, 15, 17 — central to rule design)
    - firestore.rules (Wave 0 stub — overwrite entirely)
  </read_first>
  <action>
    Overwrite `firestore.rules` with the content from 02-RESEARCH.md §"Example A" lines ~621-720. Key requirements:

    - `rules_version = '2'`
    - Helpers at top: `isSignedIn()`, `isForeman(group)`, `isMember(group)`, `canRead(group)`, `loadGroup(gid)` (per Example A)
    - **MUST INCLUDE** the phone-fallback in `isMember(group)` per RESEARCH §"Cross-document read note" recommendation — defense-in-depth against claim race window:
      ```
      function isMember(group) {
        return isSignedIn() && (
          request.auth.uid in group.memberUids
          || (request.auth.token.phone_number != null && request.auth.token.phone_number in group.memberPhones)
        );
      }
      ```
    - Per the additional locked decision (soft-delete only): `allow delete: if isForeman(resource.data);` on `/groups/{groupId}` STAYS (rule layer permits, but client code calls `archiveGroup`, not `tx.delete`). Optionally also block deletes — but the locked policy is "soft-delete by convention, rule still allows for migration / debug." Keep allow-delete for foreman; document in SUMMARY.
    - **CYCLE WRITES** (`match /cycles/{cycleId}`):
      - allow create, update: if isForeman(loadGroup(groupId)) AND drawType in whitelist AND (conducted == false OR (discount validated against `loadGroup(groupId).maxDiscountPct * loadGroup(groupId).amount * loadGroup(groupId).totalMembers / 100` AND winnerId NOT in `loadGroup(groupId).prizedMemberIds`))
      - allow delete: if false
      - Per researcher additional locked decision #4: foreman cycle-correction permissions are PERMISSIVE — the rule allows update of conducted cycles (no "must include correction note" check). Phase 5 may tighten. Keep the discount-cap + prized-once checks unconditional even on update.
    - **PAYMENTS**: create/update only foreman + `markedByUid == request.auth.uid`; delete forbidden
    - **AUDIT** (`/audit/{eventId}`): create only foreman with `actorUid == request.auth.uid`; update + delete forbidden for everyone (Pitfall 15 — even foreman can't rewrite history)
    - **phoneIndex/{e164}**: read if signed-in AND `request.auth.token.phone_number == e164`; create-only with same check + `request.resource.data.uid == request.auth.uid`; update/delete forbidden (first-write-wins)
    - **Group create validation**: `foremanUid == request.auth.uid`, `foremanUid` in memberUids, drawType in whitelist, foremanCommissionPct ≤ 5, maxDiscountPct ≤ 40
    - **Group update**: only foreman, AND `request.resource.data.foremanUid == resource.data.foremanUid` (foreman cannot be changed)

    Format: 2-space indents, blank lines between match blocks, comments per Example A. Total file ~80-100 lines.
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');const r=fs.readFileSync('firestore.rules','utf8');for (const s of ['rules_version','isForeman','isMember','loadGroup','phone_number','memberPhones','memberUids','foremanUid','maxDiscountPct','prizedMemberIds','phoneIndex','allow update, delete: if false','allow delete: if false']) if(!r.includes(s)){console.error('rules missing '+s);process.exit(1)};if (r.includes('if request.time < timestamp.date(2099')){console.error('stub still present');process.exit(1)};if (!r.match(/match \\/audit\\/\\{eventId\\}/)){console.error('audit match block missing');process.exit(1)};console.log('ok')"</automated>
  </verify>
  <acceptance_criteria>
    - firestore.rules no longer contains the Wave 0 permissive stub (`request.time < timestamp.date(2099)`)
    - Helpers: isSignedIn, isForeman, isMember (WITH phone-fallback), canRead, loadGroup
    - groups/{gid}: read=canRead, create with foremanUid==auth.uid + enum/numeric validation, update only foreman + foremanUid unchanged, delete only foreman
    - groups/{gid}/cycles/{cid}: read=canRead, create/update foreman + discount-cap via loadGroup + drawType enum + prized-once via prizedMemberIds, delete: false
    - groups/{gid}/cycles/{cid}/payments/{mid}: read=canRead, create/update foreman + markedByUid==auth.uid, delete: false
    - groups/{gid}/audit/{eid}: read=canRead, create foreman + actorUid==auth.uid, update+delete: false
    - phoneIndex/{e164}: read+create gated by phone_number==e164, update+delete: false
    - File compiles via `firebase emulators:start --only firestore` without parse errors (verified in Task 2)
  </acceptance_criteria>
  <done>Production rules file ready; rule layer enforces every CONTEXT row.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Unskip + expand tests/firestore-rules.test.ts to cover every rule decision</name>
  <files>tests/firestore-rules.test.ts</files>
  <read_first>
    - 02-RESEARCH.md §"Example B" (lines ~736-894 — full test scaffold with describe blocks)
    - tests/firestore-rules.test.ts (Wave 0 — currently most blocks are describe.skip)
    - tests/_helpers.ts (Wave 2 — shared setup)
    - firestore.rules (just written in Task 1 — load via readFileSync into the test env)
  </read_first>
  <behavior>
    Every describe block in tests/firestore-rules.test.ts MUST be active (no .skip) and pass. The suite MUST cover at minimum:

    A. `describe('groups read')`:
      - stranger cannot read a group they are not in
      - member can read their group (uid in memberUids)
      - foreman can read their group
      - **phone-fallback**: a user whose phone is in memberPhones but uid NOT yet in memberUids CAN read (defense-in-depth against claim race) — auth context built with `{ phone_number: MEMBER.phone }` but uid is fresh
      - unauthenticated context cannot read

    B. `describe('groups write')`:
      - member cannot write the group doc (any field)
      - foreman can update name
      - foreman cannot change foremanUid (rejected)
      - stranger cannot create a group claiming someone else's uid as foreman
      - create with foremanCommissionPct > 5 rejected
      - create with maxDiscountPct > 40 rejected
      - create with drawType='self-assign' rejected (enum whitelist)
      - create with foremanUid == request.auth.uid AND uid in memberUids AND valid enums/ranges → succeeds

    C. `describe('cycles write — discount cap (Pitfall 17)')`:
      - rejects discount > maxDiscountPct * amount * totalMembers / 100 (e.g., 50% on a maxDiscountPct=30 group)
      - accepts discount at cap
      - rejects unknown drawType
      - rejects winnerId already in prizedMemberIds (Pitfall 2 — re-prize)
      - member cannot write a cycle
      - foreman can update a not-yet-conducted cycle freely
      - cycle delete forbidden even for foreman

    D. `describe('payments write')`:
      - foreman can mark payment with markedByUid==self
      - foreman cannot mark with markedByUid==someone else
      - member cannot write a payment (even own)
      - payment delete forbidden

    E. `describe('audit log — append only')`:
      - foreman can create audit entry with actorUid==self
      - foreman cannot create entry with actorUid==someone else
      - foreman CANNOT update an existing audit entry (rule layer denies)
      - foreman CANNOT delete an audit entry (Pitfall 15)
      - member can read audit entries (canRead)
      - stranger cannot read audit entries

    F. `describe('phoneIndex')`:
      - user can claim their own phone (token.phone_number == doc id)
      - user cannot claim someone else's phone
      - claim is immutable (update forbidden even by self)
      - delete forbidden
      - user can read their own claim (e.g., to detect double-claim)

    Each test calls `assertSucceeds(...)` or `assertFails(...)` from `@firebase/rules-unit-testing`.
  </behavior>
  <action>
    1. Remove `.skip` from every `describe.skip(...)` block in `tests/firestore-rules.test.ts` (or rewrite the file from RESEARCH §"Example B" if simpler).

    2. Use helpers from `tests/_helpers.ts`. Seed groups with `withSecurityRulesDisabled` in `beforeEach`. Use authenticatedContext with `{ phone_number: ... }` so phone-fallback rules see the token claim.

    3. ADD the tests listed under "behavior" above that are not in Example B:
       - Phone-fallback read test (new — closes Wave 3's gap)
       - Group create validation tests (foremanCommissionPct > 5, maxDiscountPct > 40)
       - Cycle prized-once via prizedMemberIds (new — Pitfall 2 coverage)
       - Payment markedByUid mismatch test
       - phoneIndex own-claim read test

    4. Each `it(...)` should be ≤ 15 lines. Use shared `seedGroup` from _helpers.

    5. After file rewrite, run `npm run test:rules` and iterate until ALL tests green. If a test reveals a rules bug, fix `firestore.rules` (Task 1) and re-run. The Wave 7 smoke (plan 02-08) will catch any final integration gaps.
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');const t=fs.readFileSync('tests/firestore-rules.test.ts','utf8');if (t.match(/describe\\.skip/)){console.error('describe.skip still present');process.exit(1)};const expectedSuites=['groups read','groups write','cycles write','payments write','audit log','phoneIndex'];for (const s of expectedSuites) if (!t.includes(s)){console.error('missing suite: '+s);process.exit(1)};if (!t.includes('phone_number')){console.error('missing phone-fallback test');process.exit(1)};if (!t.includes('prizedMemberIds')){console.error('missing prized-once test');process.exit(1)};console.log('ok')" && npm run test:rules</automated>
  </verify>
  <acceptance_criteria>
    - No `describe.skip(...)` in tests/firestore-rules.test.ts
    - All six top-level describe blocks (groups read, groups write, cycles write, payments write, audit, phoneIndex) exist and contain the behaviors listed above
    - Phone-fallback read test present (token has phone_number in memberPhones but uid NOT in memberUids → read succeeds)
    - Prized-once via prizedMemberIds test present (winnerId already in prizedMemberIds → cycle write rejected)
    - `npm run test:rules` exits 0 with all suites passing
  </acceptance_criteria>
  <done>Every row of the locked rule table is enforced by rules + provably tested under emulator.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client → Firestore | the LAST line of defense; client-side checks (storage helpers) can be bypassed by a hostile client |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-12 | Information Disclosure | stranger reads group | mitigate | canRead = isForeman OR isMember (with phone fallback); test A1 |
| T-02-13 | Tampering | member writes payment / cycle | mitigate | rule denies; tests D2, C5 |
| T-02-14 | Tampering | foreman writes cycle with discount > cap | mitigate | get() cross-doc read enforces; test C1 |
| T-02-15 | Tampering | foreman re-prizes already-prized member | mitigate | rule rejects winnerId in prizedMemberIds; test C4 (Pitfall 2) |
| T-02-16 | Tampering | foreman submits drawType='self-assign' | mitigate | enum whitelist on create + update; test C3 |
| T-02-17 | Repudiation | foreman rewrites audit log to hide dispute | mitigate | audit update + delete forbidden FOR EVERYONE; tests E3, E4 (Pitfall 15) |
| T-02-18 | Spoofing | attacker claims someone else's phoneIndex | mitigate | token.phone_number == e164 + resource.data.uid == auth.uid; tests F2 |
| T-02-19 | Tampering | foreman secretly transfers foreman role mid-cycle | mitigate | update rule requires foremanUid unchanged; test B3 |
| T-02-20 | DoS | cross-doc get() reads inflate quota on hot paths | accept | one get(group) per cycle/payment/audit write; documented as Pitfall K |
</threat_model>

<verification>
- `npm run test:rules` exits 0
- All previously-skipped describe blocks now active
- No `request.time < timestamp.date(2099)` in firestore.rules
- Phone-fallback test passes (proves race window closure)
</verification>

<success_criteria>
A pen-tester running ad-hoc Firestore writes from a stolen ID token cannot read another group, cannot write any group they're a member of, cannot modify the audit log, cannot bypass the discount cap, and cannot re-prize a member. The emulator suite proves it.
</success_criteria>

<output>
After completion, create `.planning/phases/02-multi-user-data-model-security/02-04-production-security-rules-and-tests-SUMMARY.md` recording: the final rules file, count of tests by suite, any bug discovered in firestore.rules during testing, and the cost-acceptance note about `get()` reads per write.
</output>
