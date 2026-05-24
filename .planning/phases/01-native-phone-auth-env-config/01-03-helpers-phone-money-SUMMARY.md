---
phase: 01-native-phone-auth-env-config
plan: 03-helpers-phone-money
subsystem: utils
tags: [helpers, paisa, e164, phone, money, wave-2]
dependency_graph:
  requires:
    - "01-01 (jest + eslint + RED scaffolds)"
  provides:
    - "src/utils/phone.ts (toE164, isValidIndianMobile, formatNational)"
    - "src/utils/money.ts (Paisa branded integer + paisa/toRupees/add/sub/mul/formatINR)"
    - "AddMemberScreen writes Member.phone as canonical E.164"
  affects:
    - "src/screens/AddMemberScreen.tsx (single edit site for AddMember; LoginScreen.tsx deferred to 01-04)"
tech-stack:
  added:
    - "libphonenumber-js ^1.13.3 (npm install; production dep)"
  patterns:
    - "libphonenumber-js/min sub-path import (~110KB metadata, IN-sufficient)"
    - "TS branded integer (number & { __brand: 'Paisa' }) — runtime is plain number, brand prevents accidental rupee-into-paisa assignment"
    - "isValidIndianMobile enforces TRAI 6-9 leading digit explicitly; /min metadata is too permissive (accepts leading 5 for sub-route series)"
    - "formatINR reuses fmtINR from src/lib/theme.ts — single grouping convention app-wide"
key-files:
  created:
    - src/utils/phone.ts
    - src/utils/money.ts
  modified:
    - src/screens/AddMemberScreen.tsx
    - tests/phone.test.ts (5 → 10 assertions)
    - tests/money.test.ts (3 → 11 assertions)
    - package.json (libphonenumber-js dep)
    - package-lock.json
decisions:
  - "isValidIndianMobile fast-path is authoritative for 10-digit input. The /min libphonenumber-js metadata accepts 5876543210 as valid IN because some leading-5 series exist in carrier sub-routes; the plan's behavior explicitly requires false for TRAI mobile validation, so we short-circuit the parser for 10-digit (and 11-/12-digit with trunk/country prefix) inputs."
  - "Member.phone is now stored as raw E.164 ('+919876543210'); the human-readable '+91 98765 43210' form is reconstructed at display time via formatNational. Pre-Phase-1 records that already hold the space-formatted string stay as-is per CONTEXT.md (no migration); future phone-keyed lookups must normalize on read (Pitfall D)."
  - "Default name fallback in AddMember switched from `+91 ${digits}` to formatNational(e164). Same display, but routed through the sanctioned formatter — removes both Pitfall-6 lint violations on lines 70+71 in one stroke."
metrics:
  duration_minutes: ~15
  completed: 2026-05-24
---

# Phase 1 Plan 3: Phone + Money Helpers — Summary

Wave 2 paving: `toE164` is now the only writer of E.164 phone strings in the app (Pitfall 6 single-writer rule lands), and `Paisa` is in place as the integer-paisa money primitive new code reaches for from Phase 3 onward (Pitfall 1). AddMemberScreen flows through both.

## What Shipped

| Item | File | Status |
|---|---|---|
| `toE164`, `isValidIndianMobile`, `formatNational` (libphonenumber-js/min) | `src/utils/phone.ts` | New |
| `Paisa` brand + `paisa/toRupees/addPaisa/subPaisa/mulPaisa/formatINR` | `src/utils/money.ts` | New |
| `Member.phone` saves as E.164 (`+919876543210`) | `src/screens/AddMemberScreen.tsx` | Modified |
| 10 GREEN assertions for phone primitives | `tests/phone.test.ts` | Expanded (5 → 10) |
| 11 GREEN assertions for Paisa primitives | `tests/money.test.ts` | Expanded (3 → 11) |
| `libphonenumber-js ^1.13.3` production dep | `package.json` | Added |

## Tasks Completed

| # | Task | Commit |
|---|---|---|
| 1 | Implement `src/utils/phone.ts` — green `tests/phone.test.ts` | `b50b806` |
| 2 | Implement `src/utils/money.ts` (Paisa) — green `tests/money.test.ts` | `347f1ae` |
| 3 | Wire `toE164` into `AddMemberScreen.tsx` save path | `1ff1db7` |

## Verification Results

- `npm test -- tests/phone.test.ts tests/money.test.ts` → **2 suites PASS, 21 assertions GREEN.**
- `npx jest` (full) → 2 PASS (phone, money), 2 RED (firebase-config, auth-context) — the two RED belong to plans 01-02 and 01-04 respectively and are expected to stay RED until those plans land.
- `npx eslint src/utils/**/*.ts src/screens/AddMemberScreen.tsx` → **EXIT 0** (zero violations). AddMember previously held 2 Pitfall-6 template-literal violations (lines 70, 71); both are gone.
- `git diff src/utils/chitti.ts src/types/` → **zero output** — no money-field migration leakage. CONTEXT.md "minimal Paisa helper, NO migration" is upheld.
- `grep -c "do NOT refactor existing fields ad-hoc" src/utils/money.ts` → **1** (ADR header phrase intact for downstream grep gates).
- `grep -c "from '../lib/theme'" src/utils/money.ts` → **1** (formatINR reuses fmtINR; one grouping convention).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] `isValidIndianMobile('5876543210')` returned `true` against the plan's explicit `false` expectation**
- **Found during:** Task 1 verification (`npx jest tests/phone.test.ts` showed 1/10 failing).
- **Issue:** The pattern from RESEARCH.md §Pattern 4 deferred to `parsePhoneNumberFromString(input, 'IN').isValid()` after the fast-path miss. With the `/min` build's IN metadata, `5876543210` is considered valid (leading-5 series exist in some carrier sub-routes), which contradicts the plan's TRAI-mobile-only behavior (`/^[6-9]/`).
- **Fix:** Made the regex authoritative for 10-digit input (and the trunk-0 + country-prefix variants). The libphonenumber parser is only consulted for genuinely formatted inputs that don't reduce to 10/11/12 plain digits.
- **Files modified:** `src/utils/phone.ts`
- **Commit:** `b50b806`

**2. [Rule 3 — Blocking] Acceptance-criterion grep `do NOT refactor existing fields ad-hoc` returned 0 because the phrase wrapped across two comment lines**
- **Found during:** Task 2 acceptance gate.
- **Issue:** Plan task 2 calls for `grep -c "do NOT refactor existing fields ad-hoc" src/utils/money.ts` to return 1. My initial ADR formatting hard-wrapped the comment so "do NOT" landed on one line and "refactor existing fields ad-hoc" on the next, defeating the grep.
- **Fix:** Reflowed the ADR comment so the entire phrase fits on a single line. Same content, gate now passes.
- **Files modified:** `src/utils/money.ts`
- **Commit:** `347f1ae`

**3. [Rule 1 — Bug] ADR comment named `ChittiGroup.amount` / `Cycle.winAmount` which tripped the "no migration leakage" grep**
- **Found during:** Task 2 acceptance gate (`grep -E "ChittiGroup\\.amount|Cycle\\.winAmount" src/utils/money.ts` returned 2 hits in the documentation comment alone).
- **Issue:** Even mentioning the existing fields by name in the ADR header tripped a verification grep that was supposed to confirm no migration of those fields happened. The grep intent is to assert no _code change_ touches them — but the criterion as written is line-grain, so even a comment counted.
- **Fix:** Rephrased the ADR comment to "existing money fields" generically. No content lost; the grep now correctly returns 0.
- **Files modified:** `src/utils/money.ts`
- **Commit:** `347f1ae`

## Files NOT Modified (Proof of No-Migration Rule)

- `src/utils/chitti.ts` — chit-math helpers unchanged. `git diff` empty.
- `src/types/index.ts` — `Member.phone: string` type unchanged. `ChittiGroup.amount`, `Cycle.winAmount` types unchanged. `git diff` empty.
- `src/lib/firebase.ts` — Phase 1 Plan 2's concern, not this plan's.
- `src/lib/AuthContext.tsx` — Plan 4's concern.
- `src/screens/LoginScreen.tsx` — Plan 4's concern (combining auth swap + toE164 wire-in keeps one file-edit per file).

## Pitfall D Back-compat Note

Pre-Phase-1 `Member.phone` values stored in Firestore use the space-formatted display style (`+91 98765 43210`). From this plan onward, AddMember writes E.164 (`+919876543210`). Any future phone-keyed lookup (Phase 2+) must normalize the stored value through `toE164(member.phone, 'IN')` before comparing — otherwise the two formats will never match and lookups will silently miss legacy records. The inline comment in `AddMemberScreen.addMember()` flags this for future readers.

## Self-Check: PASSED

- File `src/utils/phone.ts` — FOUND
- File `src/utils/money.ts` — FOUND
- File `tests/phone.test.ts` — FOUND
- File `tests/money.test.ts` — FOUND
- File `.planning/phases/01-native-phone-auth-env-config/01-03-helpers-phone-money-SUMMARY.md` — FOUND (this file)
- Commit `b50b806` (Task 1) — FOUND
- Commit `347f1ae` (Task 2) — FOUND
- Commit `1ff1db7` (Task 3) — FOUND

## Known Stubs

None — all three exports in `phone.ts` and all seven exports in `money.ts` are fully implemented and tested. No placeholder branches, no TODOs, no empty returns flowing to UI.

## Threat Flags

None. This plan only adds pure-function helpers and one save-path normalization. No new network surface, auth boundary, file-access pattern, or schema change.

## What Unblocks

- **Plan 01-04** (native auth swap) can now `import { toE164 } from '../utils/phone'` in `LoginScreen.sendOTP()` and remove the last `+91${digits}` template-literal violation from the codebase. The ESLint rule's hit count goes from 1 → 0 after Plan 04.
- **Phases 3–5** can `import { Paisa, paisa, addPaisa } from '../utils/money'` for any new money field (contributions, settlements, fees) without further setup. Existing `ChittiGroup.amount` etc. stay untouched until a planned migration phase.
