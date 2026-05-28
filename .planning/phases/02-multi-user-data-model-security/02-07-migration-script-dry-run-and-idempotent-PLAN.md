---
phase: 02-multi-user-data-model-security
plan: 07
type: execute
wave: 6
depends_on: [02-02, 02-04]
files_modified:
  - scripts/migrate-to-multi-user.ts
  - package.json
  - .gitignore
  - tests/migration-script.test.ts
  - .planning/codebase/STACK.md
autonomous: true
requirements: [DATA-05]
must_haves:
  truths:
    - "Running `npx ts-node scripts/migrate-to-multi-user.ts --dry-run` reads every users/{uid}/groups/* doc and logs `[dry-run]` lines + summary with zero Firestore writes"
    - "Running `npx ts-node scripts/migrate-to-multi-user.ts` (live) writes each legacy group to top-level groups/{gid} with reshaped memberPhones/memberMeta/memberUids/prizedMemberIds + cycles + payments subcollections + one 'group.created' audit event labelling 'migratedFrom'"
    - "Un-normalizable phones (toE164 returns null) are logged with `[warn]` lines and excluded from memberPhones[] but retained in memberMeta with original phone string + status='pending'"
    - "Re-running the migration is idempotent — second run logs `[skip] group {gid} already exists top-level` for every previously-migrated group and writes nothing"
    - "Each migrated group's write is wrapped in db.runTransaction so a partial failure does not leave half-state"
    - "Summary line counts migrated / skipped / errors / skippedPhones"
  artifacts:
    - path: "scripts/migrate-to-multi-user.ts"
      provides: "one-shot migration runner with --dry-run flag, idempotent, transactional per group"
    - path: "tests/migration-script.test.ts"
      provides: "emulator test seeding legacy users/{uid}/groups/* + verifying dry-run + live + idempotent rerun"
    - path: ".planning/codebase/STACK.md"
      provides: "documented invocation instructions for the migration"
  key_links:
    - from: "scripts/migrate-to-multi-user.ts"
      to: "firebase-admin Firestore"
      via: "cert(serviceAccountJSON) -> getFirestore()"
      pattern: "firebase-admin"
    - from: "scripts/migrate-to-multi-user.ts"
      to: "src/utils/phone.ts toE164"
      via: "import + per-member phone normalization"
      pattern: "toE164"
tags: [migration, firebase-admin, idempotent, dry-run, data-05]
---

<objective>
Ship the one-shot Node migration script that converts any `users/{uid}/groups/*` prototype data into the new top-level `groups/{gid}` shape (Wave 1's schema). The prototype project has no real users yet, so this is largely a discipline exercise — but the discipline pays off the moment we need to do a real production migration.

Purpose: DATA-05 lands here. Without the script, the rule "stranger cannot read your group" silently means "no one can read your old prototype groups."
Output: scripts/migrate-to-multi-user.ts + emulator test proving dry-run + live + idempotent rerun + service-account onboarding docs.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/02-multi-user-data-model-security/02-CONTEXT.md
@.planning/phases/02-multi-user-data-model-security/02-RESEARCH.md
@src/utils/phone.ts
@src/types/index.ts
@.planning/codebase/STACK.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install firebase-admin + ts-node devDeps and create scripts/migrate-to-multi-user.ts</name>
  <files>scripts/migrate-to-multi-user.ts, package.json, .gitignore</files>
  <read_first>
    - 02-RESEARCH.md §"Example E" (lines ~1035-1160 — full migration script verbatim)
    - 02-RESEARCH.md §"Environment Availability" (firebase-admin + service-account JSON requirements)
    - src/utils/phone.ts (toE164 — used to normalize legacy phone strings)
    - src/types/index.ts (LegacyMember alias + new ChittiGroup shape)
    - .gitignore (add migration-service-account.json)
  </read_first>
  <action>
    1. **Install devDeps:** `npm install --save-dev firebase-admin@^12.0.0 ts-node@^10.9.2`. Verify versions in package.json after.

    2. **Create scripts/migrate-to-multi-user.ts** per RESEARCH §"Example E" (lines ~1035-1160). Verbatim with these adjustments:

       - Replace the hard-delete-on-rollback pattern (absent in research): NONE — the research version is already correct.
       - The "Initial audit entry" inside the per-group runTransaction must use `actorRole: 'system'` and `notes: 'Auto-migrated by scripts/migrate-to-multi-user.ts'` (already in Example E).
       - Add ONE adjustment per the additional locked decision #1 (soft-delete): migrated groups MUST have `isActive: legacy.isActive ?? true` (already in Example E); if legacy.isActive is false, set new doc's `deletedAt: legacy.deletedAt ?? new Date().toISOString()` so the soft-delete state preserves. Add this conditional after the `isActive` assignment.
       - Add ONE adjustment per the additional locked decision #2: do NOT migrate `memberTokens/*`. The script ignores that collection entirely (it's being deleted in Wave 1).
       - Per CONTEXT §"Demo mode" — demo data uses `'demo-user'` as foremanUid, NOT a real uid. The migration script should SKIP groups under `users/demo-user/...` (a defensive filter). Add `if (uid === 'demo-user') continue;` at top of the per-user loop.

    3. **Add `.gitignore` entries:**
       - `migration-service-account.json`
       - `*-service-account.json`
       Verify these are not committed.

    4. **Add npm script for convenience:**
       ```
       "migrate:dry-run": "ts-node scripts/migrate-to-multi-user.ts --dry-run"
       "migrate:live": "ts-node scripts/migrate-to-multi-user.ts"
       ```

    5. **Script header docblock** must include:
       - Invocation examples
       - Required env: `GOOGLE_APPLICATION_CREDENTIALS=./migration-service-account.json`
       - Where to download service account JSON (Firebase Console > Project Settings > Service accounts)
       - Idempotency guarantee
       - Soft-delete preservation note
       - Skip-demo-user note
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');if (!fs.existsSync('scripts/migrate-to-multi-user.ts')){console.error('missing script');process.exit(1)};const s=fs.readFileSync('scripts/migrate-to-multi-user.ts','utf8');for (const k of ['firebase-admin','toE164','--dry-run','memberPhones','memberMeta','runTransaction','prizedMemberIds','migratedFrom','demo-user','isActive']) if(!s.includes(k)){console.error('script missing '+k);process.exit(1)};const p=JSON.parse(fs.readFileSync('package.json','utf8'));if (!p.devDependencies['firebase-admin']||!p.devDependencies['ts-node']){console.error('deps missing');process.exit(1)};if (!p.scripts['migrate:dry-run']||!p.scripts['migrate:live']){console.error('npm scripts missing');process.exit(1)};const gi=fs.readFileSync('.gitignore','utf8');if (!gi.includes('migration-service-account.json')&&!gi.includes('*-service-account.json')){console.error('.gitignore missing service-account pattern');process.exit(1)};console.log('ok')" && npx tsc --noEmit scripts/migrate-to-multi-user.ts 2>&1 | head -20</automated>
  </verify>
  <acceptance_criteria>
    - scripts/migrate-to-multi-user.ts exists and matches RESEARCH §"Example E" + the four adjustments above
    - firebase-admin@^12 + ts-node@^10.9 in devDeps
    - `migrate:dry-run` + `migrate:live` npm scripts present
    - .gitignore excludes `migration-service-account.json`
    - script compiles via `npx tsc --noEmit scripts/migrate-to-multi-user.ts` (may need separate tsconfig path or a `// @ts-nocheck` header if the main tsconfig excludes scripts — researcher's call)
    - Script reads `process.argv.includes('--dry-run')` to toggle write mode
    - Script imports `toE164` from `src/utils/phone` (relative import path)
    - Script skips `uid === 'demo-user'` at top of loop
  </acceptance_criteria>
  <done>Migration script ready; live or dry-run invocation works against a service-account-authed Firebase project.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Emulator test — seed legacy data, verify dry-run + live + idempotent rerun + un-normalizable phones</name>
  <files>tests/migration-script.test.ts, package.json</files>
  <read_first>
    - scripts/migrate-to-multi-user.ts (the script just created)
    - tests/_helpers.ts (Wave 2 — env, FOREMAN/MEMBER/STRANGER)
    - 02-RESEARCH.md §"Validation Architecture" row "DATA-05 — Migration script dry-run produces expected output"
    - 02-RESEARCH.md §"Pitfall 5" — orphaned member-side experience after naive migration (the failure mode this test guards against)
  </read_first>
  <behavior>
    Tests run under emulator (added to `npm run test:rules` glob OR a new `npm run test:migration` script).

    Setup (beforeEach):
      - clearFirestore via env
      - Seed legacy: write `users/uA/groups/gA1` with shape `{ id:'gA1', name:'Legacy A1', amount:5000, totalMembers:3, members: [{id:'m1',name:'Alice',phone:'+91 98765 43210',hasReceived:true,cycleReceived:2,joinedAt:'...'},{id:'m2',name:'Bob',phone:'invalid phone string'},{id:'m3',name:'Carol',phone:'+91 98765 11111'}], cycles: [{id:'c1',cycleNumber:1,conducted:true,winnerId:'m1',winAmount:14000,date:'...',payments:[{memberId:'m1',paid:true,mode:'cash'},{memberId:'m2',paid:false},{memberId:'m3',paid:true,mode:'upi'}]}], ... }`
      - Also seed `users/demo-user/groups/skip-me` — a demo-user group that MUST be skipped

    Test A — dry-run produces logs, no writes:
      - Invoke the migration `main()` function with `process.argv = ['node','migrate','--dry-run']`
      - Capture console.log via `jest.spyOn(console,'log')` AND console.warn via `jest.spyOn(console,'warn')`
      - Assert: at least one log line includes `[dry-run] would write group gA1`
      - Assert: at least one warn line includes `[warn] group gA1 member m2 phone "invalid phone string" not normalizable`
      - Assert: collection `groups/gA1` does NOT exist after dry-run
      - Assert: a summary line `Mode: DRY-RUN` was logged

    Test B — live writes new top-level group with reshaped data:
      - Invoke main() with `process.argv = ['node','migrate']` (no --dry-run)
      - Read groups/gA1 from emulator
      - Assert: doc exists with foremanUid='uA', memberUids=['uA'], memberPhones contains '+919876543210' (Alice) AND '+919876511111' (Carol) but NOT Bob's invalid phone; memberMeta has all three keys (m1, m2, m3) with m2's phone preserved as 'invalid phone string' + status='pending'; prizedMemberIds includes 'm1'
      - Read groups/gA1/cycles/c1: exists with conducted=true, winnerId='m1', winAmount=14000
      - Read groups/gA1/cycles/c1/payments/m1: exists with paid=true, mode='cash'
      - Read groups/gA1/audit/* (any doc): at least one with action='group.created' AND notes='Auto-migrated by scripts/migrate-to-multi-user.ts' AND actorRole='system'

    Test C — idempotent rerun:
      - Run live migration once (Test B)
      - Run live migration AGAIN
      - Assert: second run's logs include `[skip] group gA1 already exists top-level`
      - Assert: groups/gA1's createdAt is unchanged (didn't get overwritten); no duplicate audit entry written

    Test D — demo-user skip:
      - After live run, assert: collection groups/skip-me does NOT exist (defensive filter worked)

  </behavior>
  <action>
    1. Create `tests/migration-script.test.ts` covering the four tests above.

    2. The script's `main()` uses `firebase-admin` SDK; the emulator path is normally for the JS SDK. To test against the emulator with firebase-admin: set env var `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` before importing the script's `getFirestore()`. Document this in the test's `beforeAll`. Service-account credentials can be a dummy object when emulator host is set; firebase-admin bypasses real auth in emulator mode.

    3. Extract the script's `main()` into an exportable function (refactor `scripts/migrate-to-multi-user.ts` to `export async function main()` so tests can `await main()` without spawning a subprocess). Keep the bottom-of-file `if (require.main === module) main().catch(...)` for CLI use.

    4. Add npm script: `"test:migration": "firebase emulators:exec --only firestore \"FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 jest tests/migration-script.test.ts\""` (PowerShell users may need a cross-env wrapper — use `cross-env` as a devDep if Windows compatibility is needed).

    5. Optionally extend `test:rules` script to include migration too: `firebase emulators:exec --only firestore "jest --testPathPattern='tests/(firestore-rules|claim-phone|audit|migration-script)\\.test\\.ts'"` so a single command runs all emulator-backed tests.
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');if (!fs.existsSync('tests/migration-script.test.ts')){console.error('missing test');process.exit(1)};const t=fs.readFileSync('tests/migration-script.test.ts','utf8');for (const s of ['--dry-run','idempotent','demo-user','skip','invalid phone string','migratedFrom','FIRESTORE_EMULATOR_HOST']) if(!t.includes(s)){console.error('test missing '+s);process.exit(1)};const p=JSON.parse(fs.readFileSync('package.json','utf8'));const allRulesScript=p.scripts['test:rules']||'';const migScript=p.scripts['test:migration']||'';if (!allRulesScript.includes('migration')&&!migScript){console.error('no migration test npm script');process.exit(1)};const script=fs.readFileSync('scripts/migrate-to-multi-user.ts','utf8');if (!script.match(/export\\s+async\\s+function\\s+main/)){console.error('main() not exported');process.exit(1)};console.log('ok')" && npm run test:migration 2>/dev/null || npm run test:rules</automated>
  </verify>
  <acceptance_criteria>
    - tests/migration-script.test.ts exists with all four describe blocks (dry-run, live, idempotent, demo-user-skip)
    - scripts/migrate-to-multi-user.ts exports `main()` for test invocation
    - `npm run test:migration` (or `npm run test:rules` if combined) exits 0 against the emulator
    - Bob's invalid phone is preserved in memberMeta as-is but excluded from memberPhones[]
    - Re-running live migration is a no-op (second run all `[skip] ...` logs)
    - groups/skip-me does NOT exist after running migration (demo-user filter works)
  </acceptance_criteria>
  <done>Migration is provably correct: dry-run reports without writing, live writes the reshaped doc tree, reruns are idempotent, un-normalizable phones are logged + retained, demo-user data is left alone.</done>
</task>

<task type="auto">
  <name>Task 3: Document the migration in .planning/codebase/STACK.md</name>
  <files>.planning/codebase/STACK.md</files>
  <read_first>
    - .planning/codebase/STACK.md (current content — append a section)
    - scripts/migrate-to-multi-user.ts (docstring is source of truth — copy invocation block)
  </read_first>
  <action>
    Append a new `## Migration: prototype → multi-user (Phase 2 Wave 6)` section to `.planning/codebase/STACK.md`. Content:

    1. **One-time migration:** ChittiApp moved from `users/{uid}/groups/*` (Phase 0/1 prototype) to top-level `groups/{gid}` (Phase 2 multi-user). The migration is automated via `scripts/migrate-to-multi-user.ts`.

    2. **Invocation:**
       - Set `GOOGLE_APPLICATION_CREDENTIALS=./migration-service-account.json` (downloaded from Firebase Console > Project Settings > Service accounts > Generate new private key — gitignored)
       - Dry-run: `npm run migrate:dry-run` (no writes, logs intended changes)
       - Live: `npm run migrate:live`
       - Re-runs are idempotent (skips groups that already exist top-level)

    3. **Guarantees:**
       - Each migrated group is wrapped in `runTransaction` (atomic per group; partial failure leaves no half-state)
       - Un-normalizable phones logged with `[warn]` line + excluded from `memberPhones[]` but retained in `memberMeta` with `status: 'pending'` for manual fix
       - Soft-delete state preserved (`isActive: false` + `deletedAt`)
       - Demo-user data (`users/demo-user/...`) is skipped — demo storage stays in-memory
       - LINK-01 dropped (no `memberTokens/*` migration)

    4. **Failure modes:**
       - Service account JSON missing/wrong → script exits with credential error
       - Emulator vs production: set `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` to redirect writes to emulator
       - Bob-phone case (un-normalizable): manual fix via Firebase Console after migration; update memberMeta[m2].phone to a valid E.164 string + add it to memberPhones[]

    5. **What's left:** The migration is one-shot — once `chitti-app-edfb1` is migrated, `users/{uid}/groups/*` collections can be deleted manually via Firebase Console (no script automates this; preserving them is safe).
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');const s=fs.readFileSync('.planning/codebase/STACK.md','utf8');for (const k of ['migrate-to-multi-user','GOOGLE_APPLICATION_CREDENTIALS','idempotent','--dry-run','memberPhones']) if(!s.includes(k)){console.error('STACK.md missing '+k);process.exit(1)};console.log('ok')"</automated>
  </verify>
  <acceptance_criteria>
    - .planning/codebase/STACK.md has a "Migration: prototype → multi-user (Phase 2 Wave 6)" section
    - Section includes invocation, guarantees, failure modes
    - References to `migration-service-account.json`, `--dry-run`, `idempotent`, and `LINK-01 dropped` present
  </acceptance_criteria>
  <done>Operational docs match the script; future-you can run the migration without re-reading research.</done>
</task>

</tasks>

<threat_model>
## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-26 | Tampering | live migration partial-failure leaves group half-migrated | mitigate | per-group runTransaction (Example E line ~1119); atomicity guarantee |
| T-02-27 | Information Disclosure | service-account JSON committed by accident | mitigate | .gitignore patterns added + documented; CI does not need the JSON |
| T-02-28 | Tampering | re-running migration corrupts already-migrated data | mitigate | idempotent skip check at top of per-group loop (Example E line ~1069); tested |
| T-02-29 | Information Disclosure | un-normalizable phone leaves memberPhones[] short → member can never claim via phone-claim flow | accept | logged with [warn] + retained in memberMeta with status='pending'; manual fix documented in STACK.md |
| T-02-30 | Spoofing | demo-user data migrated to production (wrong foremanUid) | mitigate | defensive `if (uid === 'demo-user') continue;` filter; test D |
</threat_model>

<verification>
- scripts/migrate-to-multi-user.ts compiles
- npm run test:migration (or test:rules combined) exits 0
- Manual dry-run against emulator-seeded data produces expected logs
- .gitignore correctly excludes service-account JSON patterns
</verification>

<success_criteria>
A developer with the service account JSON can run `npm run migrate:dry-run`, inspect the planned changes, then `npm run migrate:live` to convert any remaining prototype groups. Re-running is safe.
</success_criteria>

<output>
After completion, create `.planning/phases/02-multi-user-data-model-security/02-07-migration-script-dry-run-and-idempotent-SUMMARY.md` recording: script summary, test counts, soft-delete + LINK-01 + demo-user adjustments, docs added to STACK.md, any open issues (e.g., post-migration cleanup of legacy users/{uid}/groups/* — deferred to manual console action).
</output>
