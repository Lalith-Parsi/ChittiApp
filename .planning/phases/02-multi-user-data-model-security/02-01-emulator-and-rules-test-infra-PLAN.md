---
phase: 02-multi-user-data-model-security
plan: 01
type: execute
wave: 0
depends_on: []
files_modified:
  - package.json
  - firebase.json
  - firestore.rules
  - firestore.indexes.json
  - tests/firestore-rules.test.ts
  - .github/workflows/test.yml
autonomous: true
requirements: []
must_haves:
  truths:
    - "Developer can run `npm run emulator` and Firestore emulator starts on 127.0.0.1:8080"
    - "Developer can run `npm run test:rules` and at least one rules-unit-testing assertion passes against the emulator"
    - "CI workflow boots Java + emulator + runs rules tests on PR"
  artifacts:
    - path: "firebase.json"
      provides: "emulator + rules + indexes config"
    - path: "firestore.rules"
      provides: "stub allow-all rules (locked down in Wave 3)"
    - path: "firestore.indexes.json"
      provides: "composite index manifest"
    - path: "tests/firestore-rules.test.ts"
      provides: "rules-unit-testing harness skeleton with shared seedGroup/dbAs helpers"
    - path: ".github/workflows/test.yml"
      provides: "CI job that runs unit + rules tests"
  key_links:
    - from: "package.json scripts"
      to: "firebase-tools CLI"
      via: "emulator / test:rules / deploy:rules npm scripts"
      pattern: "firebase emulators"
tags: [firestore, rules, emulator, ci, infra]
---

<objective>
Stand up the local Firestore emulator + `@firebase/rules-unit-testing` harness so every subsequent wave's security-rules work has a green-loop dev cycle. No production rules yet — just the plumbing.

Purpose: Subsequent waves (3, 4, 7) cannot ship without this. Doing it first means rules tests are red-green-refactor from day one.
Output: emulator config + stub rules + indexes + test harness + CI green.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/02-multi-user-data-model-security/02-CONTEXT.md
@.planning/phases/02-multi-user-data-model-security/02-RESEARCH.md
@AGENTS.md
@package.json
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install rules-unit-testing + firebase-tools devDeps and wire npm scripts</name>
  <files>package.json</files>
  <read_first>
    - package.json (current devDeps + scripts)
    - 02-RESEARCH.md §"Standard Stack" + §"Example C" (versions + script block, lines ~85-115, 920-928)
    - 02-RESEARCH.md §"Environment Availability" (Java requirement)
  </read_first>
  <action>
    Run `npm install --save-dev @firebase/rules-unit-testing@^5.0.1 firebase-tools@^15.19.0` (versions LOCKED per researcher 2026-05-28 verification — do not float). Add three scripts to package.json `scripts` block exactly:
      - `"emulator": "firebase emulators:start --only firestore"`
      - `"test:rules": "firebase emulators:exec --only firestore \"jest tests/firestore-rules.test.ts\""`
      - `"deploy:rules": "firebase deploy --only firestore:rules,firestore:indexes --project chitti-app-edfb1"`
    Do NOT bump `firebase`, `@react-native-firebase/auth`, jest, or jest-expo. Document the Java 11+ prereq via the `actions/setup-java@v4` step in `.github/workflows/test.yml` (covered in Task 3 of this plan). No package.json change needed for the Java prereq.
  </action>
  <verify>
    <automated>node -e "const p=require('./package.json');for (const s of ['emulator','test:rules','deploy:rules']) if(!p.scripts[s]) {console.error('missing '+s); process.exit(1)} ; if(!p.devDependencies['@firebase/rules-unit-testing']) {console.error('missing dep'); process.exit(1)}; console.log('ok')"</automated>
  </verify>
  <acceptance_criteria>
    - `package.json` devDeps lists `@firebase/rules-unit-testing@^5.0.1` and `firebase-tools@^15.19.0`
    - Three new scripts present and exact: `emulator`, `test:rules`, `deploy:rules`
    - `npm install` completes without errors
    - No existing dep version changes
  </acceptance_criteria>
  <done>devDeps installed, scripts wired, package-lock.json updated, no regressions to existing deps.</done>
</task>

<task type="auto">
  <name>Task 2: Add firebase.json, stub firestore.rules, and firestore.indexes.json at repo root</name>
  <files>firebase.json, firestore.rules, firestore.indexes.json</files>
  <read_first>
    - 02-RESEARCH.md §"Example C" (firebase.json exact content)
    - 02-RESEARCH.md §"Pattern 5" (firestore.indexes.json composite index manifest)
    - 02-CONTEXT.md §"Firestore security rules" (locked rule table — final rules land Wave 3)
  </read_first>
  <action>
    Create three new files at repo root:

    1. `firebase.json` — content per RESEARCH §"Example C" (lines ~900-918): emulator on `127.0.0.1:8080`, UI on `127.0.0.1:4000`, `singleProjectMode: true`, rules + indexes paths pointing at the files below.

    2. `firestore.rules` — STUB only this wave. Use `rules_version = '2'` and a single `match /{document=**} { allow read, write: if request.time < timestamp.date(2099, 1, 1); }` block with a `// TODO(Wave 3): replace with production rules from 02-RESEARCH.md §"Example A"` header comment. The stub MUST be permissive so Wave 1/2 dev work isn't blocked; Wave 3 (plan 02-04) replaces it.

    3. `firestore.indexes.json` — content per RESEARCH §"Pattern 5" (lines ~510-538): three composite indexes — `groups`(memberPhones array-contains + isActive asc + createdAt desc), `cycles`(cycleNumber asc), `audit`(timestamp desc). `fieldOverrides: []`.

    Add all three to `.gitignore`? NO — these are source files, must be committed.
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');for (const f of ['firebase.json','firestore.rules','firestore.indexes.json']) {if(!fs.existsSync(f)){console.error('missing '+f);process.exit(1)}}; const fj=JSON.parse(fs.readFileSync('firebase.json','utf8')); if(!fj.firestore||!fj.emulators||fj.emulators.firestore.port!==8080){console.error('firebase.json bad');process.exit(1)}; const ij=JSON.parse(fs.readFileSync('firestore.indexes.json','utf8')); if(!Array.isArray(ij.indexes)||ij.indexes.length<3){console.error('indexes bad');process.exit(1)}; const rules=fs.readFileSync('firestore.rules','utf8'); if(!rules.includes('rules_version')){console.error('rules header missing');process.exit(1)}; console.log('ok')"</automated>
  </verify>
  <acceptance_criteria>
    - `firebase.json` exists with `firestore.rules` + `firestore.indexes` + emulator block (firestore port 8080, ui port 4000, singleProjectMode true)
    - `firestore.rules` exists, declares `rules_version = '2'`, has TODO-Wave-3 comment, currently permissive (stub)
    - `firestore.indexes.json` exists with all three composite indexes from RESEARCH §"Pattern 5"
    - All three files at repo root, tracked by git
  </acceptance_criteria>
  <done>All three config files committed; emulator can read them.</done>
</task>

<task type="auto">
  <name>Task 3: Create tests/firestore-rules.test.ts harness skeleton + CI workflow</name>
  <files>tests/firestore-rules.test.ts, .github/workflows/test.yml</files>
  <read_first>
    - 02-RESEARCH.md §"Example B" (full test file scaffold + helpers `seedGroup`, `dbAs`, `dbUnauth`)
    - 02-RESEARCH.md §"Example C" (CI workflow YAML)
    - tests/auth-context.test.ts (existing jest setup — confirm jest-expo preset works)
  </read_first>
  <action>
    Create two files:

    1. `tests/firestore-rules.test.ts` — Per RESEARCH §"Example B" lines ~735-895. MUST include:
       - `beforeAll` calling `initializeTestEnvironment({ projectId: 'chitti-rules-test', firestore: { rules: readFileSync('../firestore.rules'), host: '127.0.0.1', port: 8080 } })`
       - `afterAll` calling `env.cleanup()`
       - `beforeEach` calling `env.clearFirestore()`
       - Exported helpers (or top-of-file): `seedGroup(opts)`, `dbAs(user)`, `dbUnauth()`, constants `FOREMAN`, `MEMBER`, `STRANGER` with phone numbers `+919000000001`, `+919000000002`, `+919000000099`
       - ONE smoke test in this wave: `describe('emulator smoke', () => { it('writes and reads back a doc with rules-disabled context', async () => { await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(),'groups/g1'),{name:'x'}); const snap=await getDoc(doc(ctx.firestore(),'groups/g1')); expect(snap.data()?.name).toBe('x'); }); })`
       - The full rule-coverage tests (groups read/write, cycles discount cap, audit append-only, phoneIndex claim) are SCAFFOLDED as `describe.skip(...)` blocks with bodies copy-pasted from RESEARCH Example B but skipped — Wave 3 (plan 02-04) unskips them.

    2. `.github/workflows/test.yml` — Per RESEARCH §"Example C" CI block (lines ~932-948). MUST include:
       - `on: [pull_request]`
       - Steps: checkout, setup-node@v4 node 20, setup-java@v4 (`temurin` java 17), `npm ci`, `npm run lint`, `npm test -- --testPathIgnorePatterns=firestore-rules`, `npm run test:rules`
       - If a `.github/workflows/test.yml` already exists, MERGE — add the setup-java step + `test:rules` invocation but preserve any existing jobs. (Read the file first; if not present, create new.)
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');if(!fs.existsSync('tests/firestore-rules.test.ts')){console.error('missing test');process.exit(1)};const t=fs.readFileSync('tests/firestore-rules.test.ts','utf8');for (const s of ['initializeTestEnvironment','seedGroup','dbAs','describe.skip','emulator smoke','+919000000001']) if(!t.includes(s)){console.error('missing '+s);process.exit(1)};if(!fs.existsSync('.github/workflows/test.yml')){console.error('missing ci');process.exit(1)};const y=fs.readFileSync('.github/workflows/test.yml','utf8');for (const s of ['setup-java','test:rules','temurin']) if(!y.includes(s)){console.error('ci missing '+s);process.exit(1)};console.log('ok')"</automated>
  </verify>
  <acceptance_criteria>
    - `tests/firestore-rules.test.ts` exports/declares `seedGroup`, `dbAs`, `dbUnauth`, `FOREMAN`/`MEMBER`/`STRANGER` constants
    - One active smoke test exists (writes via `withSecurityRulesDisabled`, reads back, asserts shape)
    - Remaining suites scaffolded as `describe.skip(...)` so Wave 3 can unskip without rewriting
    - `.github/workflows/test.yml` includes `setup-java@v4` with `temurin` java 17 and runs `npm run test:rules` after standard tests
    - `npm run test:rules` exits 0 locally (Java + emulator both available)
  </acceptance_criteria>
  <done>Harness compiles, smoke test passes against emulator, CI YAML parsed valid, every later wave can `describe.skip` -> `describe` to enable suites.</done>
</task>

</tasks>

<verification>
- `npm install` succeeds
- `npm run emulator` starts Firestore emulator on 8080 without errors (manual; checkpoint not used)
- `npm run test:rules` exits 0 (only the smoke test runs; skipped suites are deferred)
- `tsc --noEmit` exits 0 on the new test file
</verification>

<success_criteria>
A subsequent wave can write a new `it(...)` against the emulator with zero additional setup; only writing the test.
</success_criteria>

<output>
After completion, create `.planning/phases/02-multi-user-data-model-security/02-01-emulator-and-rules-test-infra-SUMMARY.md` recording: deps installed with exact versions, config files committed, CI workflow status, any Java/emulator local-machine notes.
</output>
