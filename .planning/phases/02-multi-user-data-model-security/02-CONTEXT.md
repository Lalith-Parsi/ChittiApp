# Phase 2: Multi-User Data Model & Security — Context

**Gathered:** 2026-05-28
**Status:** Ready for research + planning
**Source:** Inline discussion during `/gsd-plan-phase 2`

<domain>
## Phase Boundary

Two different signed-in accounts can see the same chit group, with Firestore rules enforcing who reads and writes what, and every membership / cycle / payment / settings change recorded in an append-only audit log readable by all members of the group.

This phase is the **product's whole premise**. Until it ships, every screen built in the previous session is rendering against single-owner data — a foreman opens the app and sees their groups; a member added by phone can never see anything, because the data is keyed by the foreman's UID. After Phase 2, real cross-account use works.

This phase does **not** change UI design, does **not** add new visual flows, and does **not** add new draw / cycle / receipt logic — those are already built. It rewrites the data layer underneath, ships server rules, lands the audit log, and migrates any leftover prototype data. UX-01 (native confirm dialogs) already shipped in the prior session and is reconciled in scope.

**What this phase delivers:**
- Top-level `groups/{groupId}` collection visible to every member from their own account
- `phoneIndex/{e164}` lookup that activates pending memberships on first sign-in
- Append-only `audit/{groupId}/events/*` subcollection on every mutation
- `firestore.rules` in repo with full role-based authorization, tested in CI via `@firebase/rules-unit-testing`
- One-shot migration script to convert any existing `users/{uid}/groups/*` prototype data
- Demo mode continues to bypass all of this (in-memory storage, no Firestore writes)
- iOS swipe-back + Android hardware-back behave correctly on every reachable screen (UX-03)
- Native date pickers used on both platforms (UX-02)
- `tests/auth-context.test.ts` and new Firestore rules tests pass

</domain>

<decisions>
## Implementation Decisions

### Firestore data model — top-level groups + memberPhones + memberUids + phoneIndex [LOCKED]

The shape, per Phase 1 RESEARCH.md and confirmed in this discussion:

```
groups/{groupId}
  - name, description, amount, totalMembers, durationMonths, foremanCommissionPct,
    maxDiscountPct, startDate, startDay, startMonth, startYear, paymentDay, drawType,
    createdAt, isActive
  - foremanUid: string                  // the foreman's Firebase Auth uid
  - memberPhones: string[]              // E.164 strings; the array-contains query target
  - memberUids: string[]                // uids that have signed in and claimed their phone
  - memberMeta: { [memberId]: {        // name, hasReceived, cycleReceived, joinedAt
      name, phone (E.164), hasReceived, cycleReceived?, joinedAt, uid?, status
    }}
  /cycles/{cycleNumber}                 // subcollection
    - cycleNumber, date, winnerId, winAmount, discount, foremanCommission, dividendPerMember,
      drawType, conducted
    /payments/{memberId}                // subcollection
      - paid, paidDate, mode, note, markedByUid
  /audit/{eventId}                      // append-only subcollection
    - actorUid, actorRole, action, before, after, timestamp

phoneIndex/{e164}                       // top-level lookup table
  - uid: string
  - claimedAt: timestamp
```

**Member-side query:**
```javascript
db.collection('groups').where('memberPhones', 'array-contains', myPhone)
```
Requires composite index on `memberPhones`. The lookup runs every time a member opens the Home screen.

**On first sign-in:** AuthContext writes `phoneIndex/{e164} = { uid, claimedAt }`. A trigger (or client-side reconciliation) appends `uid` to `memberUids[]` on every group where the user's `phone` already appears in `memberPhones[]`. This is what makes "leader adds Ravi by phone before Ravi has signed up; Ravi signs in later and sees the chit instantly" work.

**Why arrays not subcollections for membership:** `memberPhones[]` lives on the group doc and is bounded by `totalMembers` (≤ 60 per CONTEXT). Lookup is O(1) with composite index. A separate `memberships/{uid}/{groupId}` index doc would double the writes per add. Per PITFALLS.md (Pitfall 5 — Firestore arrays).

### Migration path — one-shot script, dry-run, idempotent [LOCKED]

- Node script at `scripts/migrate-to-multi-user.ts` (or similar).
- Reads every `users/{uid}/groups/{groupId}` doc in the prototype Firebase project.
- For each: maps to the new top-level shape, populates `foremanUid` from the source uid, derives `memberPhones` from each member's normalized E.164 phone, leaves `memberUids` empty (gets populated by sign-in claim).
- Writes via `runTransaction` so a partial failure doesn't leave half-state.
- Logs:
  - One line per successfully migrated group
  - One line per un-normalizable phone (skipped, group still migrated with that member excluded — flagged for manual fix)
  - One summary line at end
- Has a `--dry-run` flag that produces the same logs but writes nothing.
- Safe to re-run: existing top-level groups are detected and skipped (idempotent).
- The prototype project (`chitti-app-edfb1`) has no real users yet, so worst case this script is a no-op. The discipline of writing it pays off when post-launch we need to migrate again.

### Firestore security rules — production-grade + emulator test suite [LOCKED]

`firestore.rules` lands in the repo. Rule set:

| Path | Read | Write |
|---|---|---|
| `groups/{groupId}` | `request.auth.uid in resource.data.memberUids` OR `request.auth.uid == resource.data.foremanUid` | only `request.auth.uid == resource.data.foremanUid` (and on create, foremanUid must equal request.auth.uid) |
| `groups/{groupId}/cycles/{cycleId}` | same as group read | only foreman |
| `groups/{groupId}/cycles/{cycleId}/payments/{memberId}` | same as group read | only foreman; `markedByUid` must equal `request.auth.uid` |
| `groups/{groupId}/audit/{eventId}` | same as group read | append-only: create allowed for foreman, update + delete forbidden for everyone (including foreman) |
| `phoneIndex/{e164}` | the user whose phone matches (verified by phone-OTP claim) | create-only by the user claiming their own phone |

**Whitelisted enums:** `drawType in ['lottery', 'auction', 'manual']`. **Server-side discount cap:** `request.resource.data.discount <= resource.data.maxDiscountPct * resource.data.chitValue / 100`. Per PITFALLS.md Pitfall 17.

**Tests:** `@firebase/rules-unit-testing` integration tests at `tests/firestore-rules.test.ts`. Cover:
- Stranger cannot read any group
- Member can read their groups, cannot write
- Foreman can write own group, cannot write someone else's
- Audit log: foreman can append, no one can edit/delete
- Discount cap blocked server-side even if client tries to bypass
- Enum whitelist blocked server-side

Tests run against a local Firestore emulator in CI. Locally: `firebase emulators:start --only firestore`.

### Audit log — append-only subcollection, every mutation [LOCKED]

`audit/{groupId}/events/{eventId}` document shape:

```typescript
interface AuditEvent {
  id: string;
  actorUid: string;
  actorRole: 'foreman' | 'member' | 'system';
  action:
    | 'group.created'
    | 'group.archived'
    | 'group.restored'
    | 'member.added'
    | 'member.removed'
    | 'member.activated'           // when phone-claim hits
    | 'cycle.created'
    | 'cycle.conducted'
    | 'cycle.corrected'
    | 'payment.marked'
    | 'payment.unmarked'
    | 'settings.changed';
  before?: unknown;                 // JSON snapshot before
  after?: unknown;                  // JSON snapshot after
  timestamp: ServerTimestamp;
  notes?: string;
}
```

**Helper:** `appendAudit(groupId, event)` is the only writer. Every storage-layer mutation calls it inside the same `runTransaction` as the data write — guarantees data + audit land or neither does.

**Member view:** Payment rows show "marked by {actorName} · {time}" pill (already designed; just needs data wiring). A future activity tab on GroupDetail renders the full log (Phase 2 lands the data; the view exists from the prior session).

### UX-01 already shipped [RECONCILED]

`Alert.alert` replaced `window.confirm` in the prior session. Phase 2's UX-01 requirement is reconciled — no work needed, just record the SUMMARY.

### UX-02 + UX-03 — code paths land in Phase 2, hardware verification deferred to Phase 5 [LOCKED]

- **UX-02 (native date pickers):** Code already uses `@react-native-community/datetimepicker` indirectly through Expo defaults; CreateGroupScreen uses a custom day-grid, not a date picker. Phase 2 adds a native date picker for "Starting month" in CreateGroup and the optional "Paid on" date in PaymentTracking's mark-payment sheet.
- **UX-03 (gesture/back-nav):** React Navigation 7 native stack already handles iOS swipe-back. Android hardware-back needs verification per screen. Phase 2 adds `useBackHandler` hooks where confirmation dialogs should intervene (delete chit, unmark payment, conduct draw confirm).
- **Physical-device verification of both:** deferred to Phase 5 (the device-verification plan) since we don't have devices yet. Mark UX-02/UX-03 as "code complete, hardware-verified TBD" — same pattern as Phase 1's AUTH-01/AUTH-02.

### Demo mode behavior post-Phase-2 [LOCKED]

- `__demoMode` continues to short-circuit Firestore. Demo storage stays the in-memory map shipped in the prior session.
- The demo data SEEDS already use the old shape (members as array on the group doc). Update `src/storage/demo.ts` to seed in the new shape so demo mirrors real data.
- Demo mode is the **only** path that works on the web target until eventually we drop web; Phase 2 must not break it.
- The "Switch view" toggle on GroupDetail (foreman ↔ member) added in the prior session is visual-only today; Phase 2 makes it real for non-demo users (the toggle isn't shown in demo since you ARE the foreman of demo chits).

### Claude's Discretion

- Composite index definition file shape (`firestore.indexes.json`) — let the planner derive.
- Whether the storage shim stays at `src/storage/index.ts` or splits into `src/storage/groups.ts`, `src/storage/cycles.ts`, etc. — planner's call.
- Exact location of the migration script — `scripts/` directory is a sensible default.
- Whether to add `appendAudit` calls to the demo storage too (purely educational — demo isn't audited in real terms).
- How to surface the "Activity" tab on GroupDetail — already exists visually; just need to wire to audit data.
- Whether to add an App Check token check now or defer to Phase 6.

</decisions>

<canonical_refs>
## Canonical References

### Domain + product scope
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md` — DATA-01, DATA-02, DATA-03, DATA-05, SOC-03, UX-01, UX-02, UX-03
- `.planning/ROADMAP.md` — Phase 2 row + success criteria

### What already exists
- `.planning/STATE.md` — UX-01 is done; all other UI for cycle/payment/draw renders against single-user data today
- `.planning/phases/01-native-phone-auth-env-config/01-RESEARCH.md` — multi-user data model shape proposal (the source of the locked decision above)
- `src/storage/index.ts` — the shim that routes to Firestore vs demo; gets rewritten
- `src/lib/firestore.ts` — currently per-user; gets rewritten end-to-end
- `src/storage/demo.ts` — in-memory mirror; gets reshaped to match new schema
- `src/lib/AuthContext.tsx` — needs to write `phoneIndex` on first sign-in; otherwise unchanged

### Constraints
- `AGENTS.md` — Expo SDK 56 pin
- `.planning/research/PITFALLS.md` — Pitfalls 5 (Firestore arrays), 11 (concurrent writes / transactions), 17 (server-side validation)

### Phase 1 closure
- Plans 5+6 of Phase 1 stay deferred (device verification + key rotation) — Phase 2 does not need them to land

### Design
- `.planning/design-handoff/project/screens/05-06-group.jsx` — member view + audit log activity tab already designed
- `.planning/design-handoff/project/screens/07-payment-grid.jsx` — "marked by … at …" pill design

</canonical_refs>

<specifics>
## Specific Ideas

- Phase 2 is the keystone for the whole product. After it lands, the existing UI from the prior session goes from "looks like the product" to "is the product."
- The migration script is mostly a discipline exercise — there's no real prod data yet. But writing it correctly means a future "real prod data" migration is one command, not a panic.
- Firestore security rules tests need a local emulator; this is the first phase where local dev workflow gets meaningfully heavier. Worth a one-time `firebase emulators:start` script in package.json.
- The phone-claim flow is the subtlest part: a leader adds Ravi by phone Tuesday; Ravi installs and signs in Friday; Friday's sign-in must atomically claim `phoneIndex/+919876543210 → uid:xyz` AND backfill `memberUids[]` on every group where Ravi's phone appears. Cloud Function trigger is nicest; client-side reconciliation in AuthContext is also fine (and avoids Functions). The researcher should compare.
- Audit log shape is intentionally generic (`action: string, before, after`) so future event types don't need a schema migration.

</specifics>

<deferred>
## Deferred Ideas

- **Push notifications via Firebase Cloud Messaging** — v2 (NOTIF-01..03 in REQUIREMENTS.md).
- **App Check** — recommended for v1.x, not blocking Phase 2.
- **Per-region Firestore choice** — sticks with the existing `chitti-app-edfb1` region; multi-region is a v2 ops decision.
- **Soft-delete vs hard-delete for groups** — current code does hard delete; Phase 2 keeps that. Audit log records the deletion event, so we have a paper trail.
- **Phone number change** — out of scope. A user who changes their number signs out and signs back in; their old uid keeps its claimed phone, the new uid claims the new phone.

</deferred>

---

*Phase: 02-multi-user-data-model-security*
*Context gathered: 2026-05-28 via inline discussion during `/gsd-plan-phase 2`*
