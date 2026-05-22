# STATE — ChittiApp

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-22)

**Core value:** A foreman can run a real Act-1982-compliant chit end-to-end on phones — every subscriber sees their own ledger from their own device — with no spreadsheet, WhatsApp thread, or math errors.
**Current focus:** Phase 1 — Native Phone Auth & Env Config.

## Current Position

**Workflow:** active project
**Stage:** ready to plan Phase 1
**Phase:** 1 — Native Phone Auth & Env Config
**Plan:** — (run `/gsd-plan-phase 1` next)

## Progress

```
Initialization:    [██████████] 100%
  PROJECT.md        ✓
  config.json       ✓
  Research          ✓ (DOMAIN + FEATURES + PITFALLS)
  REQUIREMENTS.md   ✓ (43 v1 reqs across 11 categories)
  ROADMAP.md        ✓ (6 phases, mvp/vertical, all 43 reqs mapped)
  STATE.md          ✓

Execution:         [░░░░░░░░░░] 0 / 6 phases complete
  Phase 1  ☐  Native Phone Auth & Env Config     ← next
  Phase 2  ☐  Multi-User Data Model & Security
  Phase 3  ☐  Group Setup & Membership
  Phase 4  ☐  Cycle Ledger & Payments
  Phase 5  ☐  Draws + Cycle Math (Money-Conservation)
  Phase 6  ☐  Store Submission Readiness
```

## Phase 1 Snapshot

**Goal:** A real user signs into the app on a physical iOS or Android device via OTP, with session surviving cold starts.
**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, DATA-04 (5)
**Success criteria:** 5 (see ROADMAP.md → Phase 1)
**Open decisions to make during Phase 1 planning:**
- `@react-native-firebase/auth` + EAS Build vs Firebase JS SDK + Cloud Function + DLT-SMS provider (Pitfall 7 / 8). Decision to be recorded in `.planning/codebase/STACK.md`.
- DLT-registered SMS provider for India (MSG91 / Karix / Twilio Verify) deferred to v1.x, but voice-OTP fallback ships in v1.
- Money primitive (`Paisa`, `src/utils/money.ts`) lands during Phase 1, before any cycle math (Pitfall 1).
- Phone normalizer (`toE164`, `src/utils/phone.ts` using `libphonenumber-js`) is a Phase 1 deliverable (Pitfall 6).

## Recent Decisions

From `PROJECT.md` Key Decisions (all `— Pending` until validated by a real chit):

- Track only, no money rails (avoid payment-aggregator / NBFC regulation)
- Foreman commission modeled (≤ 5% per Chit Funds Act 1982)
- Configurable draw type per group (lottery / live auction / async auction / manual — lottery + manual in v1)
- Phone number is the identity (Splitwise-style invite, India mobile-first)
- Leader fully controls membership (no approval step)
- App Store + Play Store distribution from v1 (web is dev-only)
- Faithful to Chit Funds Act 1982 math (foreman commission, discount caps, money-conservation invariant)
- Push notifications deferred to v2; WhatsApp share-out fills the gap (D-7 in Phase 5)
- Arrears / penalties / guarantors deferred to v2
- Multi-user data model — replace `users/{uid}/groups/*` with top-level `groups/{groupId}` + `memberPhones` + `memberUids` + `phoneIndex/{e164}` (migration is Phase 2)

New from roadmap design (2026-05-22):

- 6 phases, strictly linear, vertical-MVP: every phase ships an end-to-end user-visible slice.
- Phase 5 ships **math + draw + invariant UI together** — wrong dividend in any beta build burns trust permanently.
- Phase 2 ships **schema + rules + audit log + migration together** — partial multi-user is worse than single-user.

## Workflow Config

From `.planning/config.json`:

- **Mode:** yolo (auto-approve, no per-phase approval gates)
- **Granularity:** standard (5–8 phases → landed on 6)
- **Project mode:** mvp (vertical slicing)
- **Execution:** parallel allowed
- **Git tracking:** yes
- **Model profile:** balanced (sonnet)
- **Workflow agents:** research ✓ · plan_check ✓ · verifier ✓ · nyquist_validation ✓ · ui_phase ✓ · code_review ✓

## Research Artifacts

- `.planning/research/DOMAIN.md` — Chit Funds Act 1982 parameters, money-conservation invariant, gap analysis vs current schema
- `.planning/research/FEATURES.md` — 16 table-stakes / 12 differentiators / 12 anti-features, dependency graph, MVP definition, competitor comparison
- `.planning/research/PITFALLS.md` — 17 pitfalls with phase mappings, integration gotchas, "looks done but isn't" checklist
- `.planning/codebase/ARCHITECTURE.md` — current state + anti-patterns to address inside the phases that touch their code
- `.planning/codebase/STRUCTURE.md`, `STACK.md`, `CONCERNS.md` — brownfield map

## Pending Todos

- Run `/gsd-plan-phase 1` to decompose Phase 1 into executable plans.
- Record EAS-Build-vs-Expo-Go decision in `STACK.md` during Phase 1 planning.

## Blockers / Concerns

None blocking forward motion. Carry-forward risks tracked at phase level via pitfall guardrails in ROADMAP.md.

## Session Continuity

**Last session:** 2026-05-22 — roadmap created. 6 phases, 43/43 v1 requirements mapped, traceability table populated, STATE initialized for active project.
**Stopped at:** End of initialization. Ready to plan Phase 1.
**Resume file:** —

---
*Last updated: 2026-05-22 after roadmap creation*
