# STATE — ChittiApp

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-22)

**Core value:** A foreman can run a real Act-1982-compliant chit end-to-end on phones — every subscriber sees their own ledger from their own device — with no spreadsheet, WhatsApp thread, or math errors.
**Current focus:** Completing project initialization (`/gsd-new-project`) — REQUIREMENTS.md and ROADMAP.md still to be created.

## Current Position

**Workflow:** `/gsd-new-project` (in progress)
**Stage:** Step 7 of 9 — defining requirements
**Phase:** Not yet generated (ROADMAP doesn't exist)
**Plan:** —

## Progress

```
Initialization:     [██████░░░░] 60%
  PROJECT.md         ✓
  config.json        ✓
  Research           ✓ (DOMAIN + FEATURES + PITFALLS)
  REQUIREMENTS.md    ☐  ← next
  ROADMAP.md         ☐
  STATE.md           ✓ (reconstructed this resume)
```

## Recent Decisions

From `PROJECT.md` Key Decisions (all `— Pending` until validated by a real chit):

- Track only, no money rails (avoid payment-aggregator / NBFC regulation)
- Foreman commission modeled (≤5% per Chit Funds Act 1982)
- Configurable draw type per group (lottery / live auction / async auction / manual)
- Phone number is the identity (Splitwise-style invite, India mobile-first)
- Leader fully controls membership (no approval step)
- App Store + Play Store distribution from v1 (web is dev-only)
- Faithful to Chit Funds Act 1982 math (foreman commission, discount caps, money-conservation invariant)
- Push notifications deferred to v2
- Arrears / penalties / guarantors deferred to v2
- Multi-user data model — replace `users/{uid}/groups/*` with shared groups (migration unavoidable)

## Workflow Config

From `.planning/config.json`:

- **Mode:** yolo (auto-approve, just execute)
- **Granularity:** standard (5–8 phases)
- **Execution:** parallel
- **Git tracking:** yes
- **Model profile:** balanced (sonnet)
- **Workflow agents:** research ✓ · plan_check ✓ · verifier ✓ · nyquist_validation ✓

## Research Artifacts

- `.planning/research/DOMAIN.md` — Chit Funds Act 1982 parameters, money-conservation invariant, gap analysis vs current schema
- `.planning/research/FEATURES.md` — 16 table-stakes / 12 differentiators / 12 anti-features, dependency graph, MVP definition, competitor comparison
- `.planning/research/PITFALLS.md` — domain-math traps, multi-user Firestore gotchas, phone-OTP at scale, Expo+Firebase JS on native, App/Play Store finance-adjacent submission, data-model migration plan

(STACK and ARCHITECTURE were intentionally skipped — `.planning/codebase/STACK.md` and `.planning/codebase/ARCHITECTURE.md` from the brownfield map already cover them.)

## Pending Todos

(none captured yet)

## Blockers / Concerns

- None currently blocking forward motion. Carry-forward concerns from PROJECT.md (web-only auth, hardcoded Firebase config, `stripUndefined` JSON round-trip, whole-document writes, no tests) are tracked as v1 requirements and will surface in REQUIREMENTS.md / ROADMAP.md.

## Session Continuity

**Last session:** 2026-05-22 — research swarm (targeted: FEATURES + PITFALLS) spawned in parallel. FEATURES agent returned cleanly. PITFALLS agent hit a session limit while returning its summary, but its output file (`PITFALLS.md`, 548 lines) had already been written to disk before the limit hit. Resume committed both research files.
**Stopped at:** End of Step 6 (research) in `/gsd-new-project`. Next step: Step 7 — define REQUIREMENTS.md from `FEATURES.md` v1 candidates, then Step 8 — spawn `gsd-roadmapper` to produce ROADMAP.md.
**Resume file:** —

---
*Last updated: 2026-05-22 during /gsd-resume-work*
