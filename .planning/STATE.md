# STATE — ChittiApp

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-22)

**Core value:** A foreman can run a real Act-1982-compliant chit end-to-end on phones — every subscriber sees their own ledger from their own device — with no spreadsheet, WhatsApp thread, or math errors.
**Current focus:** Phase 1 planning. Auth UI is built; the backend swap-out (native OTP + env-driven Firebase config) is the remaining Phase 1 work.

## Current Position

**Workflow:** active project, ready to plan
**Stage:** Phase 1 — Native Phone Auth & Env Config (planning not started)
**Phase:** 1 of 6
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

Execution:         [█░░░░░░░░░] 0 / 6 phases formally complete
  Phase 1  ☐  Native Phone Auth & Env Config        ← next to PLAN
                (UI shipped ahead of plan; backend + env still owed)
  Phase 2  ☐  Multi-User Data Model & Security
                (UX-01 native dialogs already shipped)
  Phase 3  ☐  Group Setup & Membership
                (Create / Add Member UIs already shipped, single-user)
  Phase 4  ☐  Cycle Ledger & Payments
                (Payment grid UI already shipped, single-user)
  Phase 5  ☐  Draws + Cycle Math (Money-Conservation)
                (Draw + Receipt UI shipped; MATH-01..04 DONE in code)
  Phase 6  ☐  Store Submission Readiness
```

## What this session shipped (ahead of phase plans)

This session redesigned and re-implemented the entire mobile UI from a Claude Design handoff (committed under `.planning/design-handoff/`). The work cut across multiple phases. Below is the honest accounting:

### Already shipped in code

| Req | Status | Where |
|---|---|---|
| **AUTH-01..04** | UI only — web RecaptchaVerifier still in place | `src/screens/LoginScreen.tsx` |
| **DATA-04** | ✗ NOT done — `firebase.ts` still hardcoded | `src/lib/firebase.ts` |
| **GROUP-01** | UI shipped, single-user only | `src/screens/CreateGroupScreen.tsx` |
| **GROUP-02..05, HOME-01..02** | UI shipped, single-user only | `src/screens/GroupDetailScreen.tsx`, `HomeScreen.tsx`, `AddMemberScreen.tsx` |
| **CYCLE-01..04** | UI shipped, single-user only | `src/screens/PaymentTrackingScreen.tsx` |
| **DRAW-01..05** | UI shipped (lottery + auction + manual all live, prized-once + discount-cap enforced) | `src/screens/DrawScreen.tsx` |
| **MATH-01..04** | ✓ **DONE** — foreman commission + invariant + visible equation | `src/utils/chitti.ts`, `MoneyEquation` in `chitti-ui.tsx`, `CycleReceiptScreen.tsx` |
| **VIEW-01..03** | UI shipped (member view is visual-only — no real multi-user data yet) | `GroupDetailScreen.tsx`, `CycleReceiptScreen.tsx` |
| **SOC-01** | Partial — manual phone entry done; `expo-contacts` integration pending | `AddMemberScreen.tsx` |
| **SOC-02** | ✓ Done — `Share` API + wa.me fallback | `CycleReceiptScreen.tsx` |
| **SOC-03** | ✗ NOT done — no audit log writes yet | — |
| **UX-01** | ✓ Done — `window.confirm` removed, `Alert.alert` everywhere | — |
| **UX-02, UX-03** | Partial — native pickers used; haven't validated on physical devices | — |
| **STORE-01..05** | ✗ NOT done — Phase 6 territory | — |

### What this means for Phase 1 planning

Phase 1's UI work is **done**. Phase 1's remaining work is the backend swap-out:

1. Replace web-only `RecaptchaVerifier` + `signInWithPhoneNumber` with native phone auth (decide: `@react-native-firebase/auth` + EAS Build vs Firebase JS SDK + Cloud Function + DLT-SMS). **The Pitfall 7/8 fork.**
2. Move Firebase config (`apiKey`, `projectId`, etc.) out of `src/lib/firebase.ts` and into `app.config.ts` + `expo-constants` from env vars (DATA-04).
3. Add `toE164()` phone normalizer using `libphonenumber-js` (Pitfall 6).
4. Add `Paisa` money primitive helper (Pitfall 1) — though much of the money handling is already integer rupees, this is now a smaller hardening pass than originally planned.
5. Verify native OTP on physical iOS + Android (Indian SIM).

### Bonus shipped this session (not roadmap-tracked)

- **Demo mode** + in-memory storage (`src/storage/demo.ts`) with 3 seeded chits in different lifecycle states — `Lalith-Parsi/ChittiApp` collaborators can preview the app without auth via the "Preview without signing in →" button.
- **Toast feedback** (`src/lib/ToastContext.tsx`) wired across Create chit / Add member / Mark paid / Conduct draw / Delete.
- **Auction draw method** — third draw mode beyond lottery + manual, with per-member bids + tie-break-by-lot per Act 1982 §16.
- **Design tokens** ported to `src/lib/theme.ts` (`Ledger green on paper warmth`).

## Recent Decisions

From `PROJECT.md` Key Decisions (all `— Pending` until validated by a real chit):

- Track only, no money rails
- Foreman commission modeled (≤ 5% per Chit Funds Act 1982)
- Configurable draw type per group — **lottery + manual + auction now all live**
- Phone number is the identity
- Leader fully controls membership
- App Store + Play Store distribution from v1
- Faithful to Chit Funds Act 1982 math — **money-conservation invariant ships ahead of Phase 5**
- Push notifications deferred to v2
- Arrears / penalties / guarantors deferred to v2
- Multi-user data model — replace `users/{uid}/groups/*` with top-level `groups/{groupId}` (still Phase 2)

New decisions from this session:

- **2026-05-22:** UI implementation jumped ahead of phase plans because the design handoff arrived early. Each phase's plan should focus on data/backend work + on-device testing; the UI is largely in place but is rendering against single-user data and will need re-wiring as the multi-user model lands.
- **2026-05-22:** Demo mode shipped as a permanent feature (not a temporary preview hack) — gives non-signed-in stakeholders a way to inspect the product without Firebase setup, and gives App Reviewers a way to evaluate without an Indian SMS-able phone.

## Workflow Config

From `.planning/config.json`:

- **Mode:** yolo (auto-approve, no per-phase approval gates)
- **Granularity:** standard (5–8 phases → landed on 6)
- **Project mode:** mvp (vertical slicing)
- **Execution:** parallel allowed
- **Git tracking:** yes
- **Model profile:** balanced (sonnet)
- **Workflow agents:** research ✓ · plan_check ✓ · verifier ✓ · nyquist_validation ✓

## Research Artifacts

- `.planning/research/DOMAIN.md` — Chit Funds Act 1982 parameters, money-conservation invariant, gap analysis
- `.planning/research/FEATURES.md` — 16 table-stakes / 12 differentiators / 12 anti-features
- `.planning/research/PITFALLS.md` — 17 pitfalls with phase mappings
- `.planning/codebase/` — brownfield map (ARCHITECTURE, STACK, STRUCTURE, CONCERNS, CONVENTIONS, TESTING, INTEGRATIONS)
- `.planning/design-handoff/` — Claude Design HTML/JSX prototype (10 screens, tokens, README, chat transcript)
- `.planning/UI-BRIEF.md` — the prompt used to generate the design

## Pending Todos

- Run `/gsd-plan-phase 1` to decompose the remaining Phase 1 work (native auth swap, env config, phone normalizer).
- Decide `@react-native-firebase/auth` vs Firebase JS SDK + Cloud Function during Phase 1 planning; record in `.planning/codebase/STACK.md`.
- Hardcoded Firebase Web API key is now public on GitHub (was in initial commit too, so net-no-change). Rotate after Phase 1 ships env config.

## Blockers / Concerns

- **None blocking forward motion.**
- Carry-forward: web-only auth means no on-device test path exists until Phase 1 lands native auth. Demo mode (`Preview without signing in`) is the workaround for stakeholder previews.

## Session Continuity

**Last session:** 2026-05-22 — Implemented all 10 designed screens, fixed the cycle math + invariant ahead of schedule, added demo mode + toasts + auction draw, pushed 14 commits to `Lalith-Parsi/ChittiApp main` via `kbreddiee` collaborator access.
**Stopped at:** Ready to plan Phase 1. UI is done; remaining work is the auth backend swap + env config.
**Resume file:** —

---
*Last updated: 2026-05-22 after session that shipped UI + demo mode + auction draw*
