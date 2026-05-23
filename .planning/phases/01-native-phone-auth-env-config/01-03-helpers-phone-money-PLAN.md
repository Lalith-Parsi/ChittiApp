---
phase: 01-native-phone-auth-env-config
plan: 03
type: execute
wave: 2
depends_on: [01]
files_modified:
  - src/utils/phone.ts
  - src/utils/money.ts
  - src/screens/AddMemberScreen.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "toE164('9876543210','IN') returns '+919876543210'; toE164('garbage') returns null"
    - "isValidIndianMobile validates the TRAI 10-digit 6-9-prefix range and the E.164 +91 form"
    - "Paisa is a branded integer type — TypeScript compile fails on `let x: Paisa = 5` without `paisa()` wrap"
    - "AddMemberScreen normalizes the entered phone via toE164() before saving the Member.phone field"
    - "No existing ChittiGroup.amount / Cycle.winAmount field is refactored (CONTEXT.md locked: NO migration)"
  artifacts:
    - path: src/utils/phone.ts
      provides: "toE164(), isValidIndianMobile(), formatNational() — single writer for Pitfall 6"
    - path: src/utils/money.ts
      provides: "Paisa branded integer + paisa()/toRupees()/addPaisa()/subPaisa()/mulPaisa()/formatINR() with ADR-style header"
  key_links:
    - from: src/screens/AddMemberScreen.tsx
      to: src/utils/phone.ts
      via: "import { toE164 } from '../utils/phone' — call before saving Member.phone"
      pattern: "toE164\\("
    - from: src/utils/money.ts
      to: src/lib/theme.ts
      via: "formatINR reuses existing fmtINR helper"
      pattern: "from '../lib/theme'"
---

<objective>
Land the two pure-function helpers that downstream phases (3 → 5) write the right primitives against from day one. `toE164` becomes the only writer of phone strings (Pitfall 6 + the lint rule from Plan 01 enforces this); `Paisa` is the integer-paisa money primitive new code reaches for (Pitfall 1). CONTEXT.md is explicit: **do not migrate existing money fields** — `ChittiGroup.amount` etc. stay as integer rupees. Only NEW fields use `Paisa`.

Purpose: paves Phases 3–5's data-modeling work with safe primitives without disrupting the math that's already correct.
Output: Two utility modules with passing unit tests, plus the AddMemberScreen normalization site. LoginScreen normalization is deferred to Plan 04 (combined with the auth swap; one edit per file).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/01-native-phone-auth-env-config/01-CONTEXT.md
@.planning/phases/01-native-phone-auth-env-config/01-RESEARCH.md
@.planning/research/PITFALLS.md
@src/lib/theme.ts
@src/screens/AddMemberScreen.tsx
@src/types
</context>

<interfaces>
<!-- Contracts produced by this plan; downstream phases consume -->

From `src/utils/phone.ts`:
```ts
export function toE164(input: string, defaultCountry?: CountryCode): string | null;
export function isValidIndianMobile(input: string): boolean;
export function formatNational(e164: string): string;
```

From `src/utils/money.ts`:
```ts
export type Paisa = number & { readonly __brand: 'Paisa' };
export function paisa(rupees: number): Paisa;
export function toRupees(p: Paisa): number;
export function addPaisa(a: Paisa, b: Paisa): Paisa;
export function subPaisa(a: Paisa, b: Paisa): Paisa;
export function mulPaisa(a: Paisa, n: number): Paisa;
export function formatINR(p: Paisa, opts?: { withSymbol?: boolean }): string;
```
</interfaces>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Implement src/utils/phone.ts (libphonenumber-js/min) — green tests/phone.test.ts</name>
  <read_first>
    - .planning/phases/01-native-phone-auth-env-config/01-RESEARCH.md §"Pattern 4: src/utils/phone.ts" (verbatim implementation template)
    - .planning/research/PITFALLS.md Pitfall 6 (toE164 single-writer rationale)
    - tests/phone.test.ts (Plan 01 red scaffold — what behaviors to satisfy)
  </read_first>
  <behavior>
    - `toE164('9876543210','IN')` → `'+919876543210'`.
    - `toE164('+91 98765 43210')` → `'+919876543210'` (whitespace tolerated).
    - `toE164('123')` → `null` (too short).
    - `toE164('garbage')` → `null`.
    - `isValidIndianMobile('9876543210')` → `true` (fast-path: 10 digits, leading 6-9).
    - `isValidIndianMobile('5876543210')` → `false` (leading 5 invalid per TRAI).
    - `isValidIndianMobile('+919876543210')` → `true` (slow-path full parse).
    - `formatNational('+919876543210')` → matches `/^\+91\s?98765\s?43210$/`.
  </behavior>
  <action>
    Create `src/utils/phone.ts` per RESEARCH §Pattern 4. Use the `libphonenumber-js/min` sub-path import (~110 KB; sufficient for IN per RESEARCH §"Alternatives Considered"). Expand `tests/phone.test.ts` (from Plan 01) to cover the eight behaviors above. Do NOT default-export anything — named exports only (so the lint rule from Plan 01 has unambiguous import sites). Do NOT touch `LoginScreen.tsx` here — Plan 04's auth swap rewrites the same `sendOTP()` block; combining keeps the file edited once.
  </action>
  <verify>
    <automated>npm test -- tests/phone.test.ts 2>&amp;1 | grep -E "PASS|FAIL|✓|✗" | head -20</automated>
  </verify>
  <acceptance_criteria>
    - `npm test -- tests/phone.test.ts` PASSES with at least 8 assertions covering the behaviors above.
    - `grep -c "libphonenumber-js/min" src/utils/phone.ts` returns 1 (correct sub-path).
    - `src/utils/phone.ts` exports exactly `toE164`, `isValidIndianMobile`, `formatNational` (no default export — `grep -c "^export default" src/utils/phone.ts` returns 0).
    - The lint rule does NOT flag the new file (`npm run lint -- src/utils/phone.ts` exits 0).
  </acceptance_criteria>
  <done>The phone-normalization primitive exists, is tested, and the rest of the codebase has a single sanctioned import path for it.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Implement src/utils/money.ts (Paisa branded integer) — green tests/money.test.ts</name>
  <read_first>
    - .planning/phases/01-native-phone-auth-env-config/01-RESEARCH.md §"Pattern 5: src/utils/money.ts (Paisa)" (verbatim ADR + implementation)
    - .planning/research/PITFALLS.md Pitfall 1 (floating-point money drift)
    - .planning/phases/01-native-phone-auth-env-config/01-CONTEXT.md (Paisa "LOCKED — minimal helper, no migration")
    - tests/money.test.ts (Plan 01 red scaffold)
    - src/lib/theme.ts (existing `fmtINR` helper — formatINR reuses it; confirm signature)
  </read_first>
  <behavior>
    - `paisa(123.45)` → `12345 as Paisa`.
    - `paisa(0.005)` rounds half-up → `1 as Paisa`.
    - `toRupees(paisa(99.99))` → `99.99` (round-trip preserves cent precision).
    - `addPaisa(paisa(10), paisa(20))` → `paisa(30)` (TS branded check enforced).
    - `subPaisa(paisa(50), paisa(20))` → `paisa(30)`.
    - `mulPaisa(paisa(10), 3)` → `paisa(30)`.
    - `formatINR(paisa(100000))` → contains `'₹'` and `'1,00,000'` (Indian-system grouping via reused `fmtINR`).
    - `formatINR(paisa(100000), { withSymbol: false })` → does NOT contain `'₹'`.
    - TypeScript compile rejects `const x: Paisa = 5` (raw number not assignable without `paisa()`).
  </behavior>
  <action>
    Create `src/utils/money.ts` per RESEARCH §Pattern 5 verbatim, including the multi-line ADR comment at the top describing the no-migration rule. The ADR comment MUST contain the literal phrase "do NOT refactor existing fields ad-hoc" so a grep gate can assert its presence. Implement all seven exported helpers. Do NOT modify `src/utils/chitti.ts`, `src/types/index.ts`, or any screen — per CONTEXT.md no existing money field is migrated. Expand `tests/money.test.ts` (from Plan 01) to cover the nine behaviors above (the TS-rejection behavior is checked by ensuring `tsc --noEmit` passes for the helpers; do NOT write a negative test that would itself fail to compile).
  </action>
  <verify>
    <automated>npm test -- tests/money.test.ts 2>&amp;1 | grep -E "PASS|FAIL|✓|✗" | head -20; npx tsc --noEmit src/utils/money.ts 2>&amp;1 | tail -5; grep -c "do NOT refactor existing fields ad-hoc" src/utils/money.ts</automated>
  </verify>
  <acceptance_criteria>
    - `npm test -- tests/money.test.ts` PASSES with ≥ 9 assertions.
    - `npx tsc --noEmit` exits 0 for the project (or at minimum for `src/utils/money.ts` in isolation).
    - `grep -c "do NOT refactor existing fields ad-hoc" src/utils/money.ts` returns 1 (ADR header intact).
    - `grep -c "from '../lib/theme'" src/utils/money.ts` returns 1 (reuses fmtINR).
    - `grep -E "ChittiGroup\\.amount|Cycle\\.winAmount" src/utils/money.ts` returns no hits (no migration leakage).
    - `git diff src/utils/chitti.ts` shows ZERO changes (no migration of existing math).
    - `git diff src/types/` shows ZERO changes (Member.phone type stays as today — Plan 04 changes the saved VALUE format, not the type).
  </acceptance_criteria>
  <done>Paisa primitive exists, tested, and explicitly does NOT touch existing money fields. New code in Phases 3-5 has a sanctioned import.</done>
</task>

<task type="auto">
  <name>Task 3: Wire toE164 into AddMemberScreen.tsx (normalize Member.phone on save)</name>
  <read_first>
    - src/screens/AddMemberScreen.tsx (full file — locate the save handler and the field that becomes Member.phone)
    - src/utils/phone.ts (just-created — import shape)
    - .planning/phases/01-native-phone-auth-env-config/01-CONTEXT.md (toE164 LOCKED: "Update AddMemberScreen.tsx to normalize the entered number to E.164 before saving on the member record")
    - .planning/research/PITFALLS.md Pitfall D (two phone formats coexisting in Firestore — back-compat note)
  </read_first>
  <action>
    In the AddMember save handler, call `toE164(rawInput, 'IN')` before constructing the Member object. If `toE164` returns `null`, surface the existing invalid-phone error path (do not save). The stored `Member.phone` becomes the E.164 string (`+919876543210`). Add a one-line comment noting that pre-Phase-1 Member records may still have space-formatted phones (Pitfall D back-compat note). Do NOT change the `Member.phone: string` TS type. Do NOT touch `LoginScreen.tsx` (Plan 04 owns it).
  </action>
  <verify>
    <automated>grep -c "toE164" src/screens/AddMemberScreen.tsx; npm run lint -- src/screens/AddMemberScreen.tsx 2>&amp;1 | grep -c "no-restricted-syntax"</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "toE164" src/screens/AddMemberScreen.tsx` returns ≥ 1.
    - `grep -E "'\\+91'\\s*\\+|\\`\\+91\\$" src/screens/AddMemberScreen.tsx` returns 0 (no hand-concat regressions; the lint rule would also catch).
    - `npm run lint -- src/screens/AddMemberScreen.tsx` exits 0 (no new violations).
    - The save path rejects when `toE164` returns null (manually verifiable: enter `123` → no save).
  </acceptance_criteria>
  <done>AddMember writes E.164 phones from now on; LoginScreen is the only remaining hand-concat site, which Plan 04 removes.</done>
</task>

</tasks>

<verification>
- `npm test -- tests/phone.test.ts tests/money.test.ts` both GREEN.
- `npm run lint -- src/utils src/screens/AddMemberScreen.tsx` exits 0.
- `git diff src/utils/chitti.ts src/types/` shows zero changes (no money migration leak; CONTEXT.md compliance).
</verification>

<success_criteria>
Phases 3–5 can `import { Paisa, paisa } from '../utils/money'` and `import { toE164 } from '../utils/phone'` without further setup. AddMember-saved phones are E.164-canonical from now on.
</success_criteria>

<output>
After completion, create `.planning/phases/01-native-phone-auth-env-config/01-03-SUMMARY.md` summarizing: helper APIs exported, test counts (phone + money), files NOT modified (proof of no-migration rule), one-line note on Pitfall D back-compat for future phone-keyed lookups.
</output>
