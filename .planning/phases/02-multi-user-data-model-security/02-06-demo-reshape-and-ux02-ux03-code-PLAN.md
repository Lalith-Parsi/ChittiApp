---
phase: 02-multi-user-data-model-security
plan: 06
type: execute
wave: 5
depends_on: [02-02]
files_modified:
  - src/storage/demo.ts
  - src/storage/index.ts
  - src/screens/CreateGroupScreen.tsx
  - src/screens/PaymentTrackingScreen.tsx
  - src/screens/DrawScreen.tsx
  - src/screens/GroupDetailScreen.tsx
  - src/lib/AuthContext.tsx
  - tests/datepicker-and-backhandler.test.tsx
  - package.json
autonomous: true
requirements: [UX-01, UX-02, UX-03]
must_haves:
  truths:
    - "Demo storage uses the new ChittiGroup shape (memberPhones, memberMeta, prizedMemberIds, no members[], no cycles[]) and exposes parallel cycle + payment Maps"
    - "All three seeded demo groups load on HomeScreen; GroupDetail loads each; mark-payment works in demo; conduct-draw works in demo"
    - "Demo mode still works on Platform.OS === 'web' (the only platform demo runs on per STATE.md)"
    - "@react-native-community/datetimepicker installed via `npx expo install` (SDK-56 pin) and used on CreateGroupScreen 'Starting month' + PaymentTrackingScreen 'Paid on'"
    - "useFocusEffect + BackHandler intercept hardware-back on DrawScreen (mid-draw discard prompt), CreateGroupScreen (unsaved-changes discard prompt), GroupDetailScreen (delete-confirm dismiss), demo-mode exit"
    - "UX-01 (Alert.alert vs window.confirm) is reconciled in SUMMARY only — already shipped in prior session per STATE.md"
    - "UX-02 + UX-03 are code-complete in Phase 2; physical-device verification deferred to Phase 5 (mirroring AUTH-01/02 pattern)"
  artifacts:
    - path: "src/storage/demo.ts"
      provides: "in-memory ChittiGroup store with memberPhones/memberMeta + parallel cycleStore + paymentStore Maps"
    - path: "src/screens/CreateGroupScreen.tsx"
      provides: "DateTimePicker for Starting month field"
    - path: "src/screens/PaymentTrackingScreen.tsx"
      provides: "DateTimePicker for 'Paid on' optional date input"
    - path: "src/screens/DrawScreen.tsx"
      provides: "useFocusEffect + BackHandler discard prompt"
    - path: "src/screens/CreateGroupScreen.tsx"
      provides: "useFocusEffect + BackHandler unsaved-changes prompt"
    - path: "src/screens/GroupDetailScreen.tsx"
      provides: "useFocusEffect + BackHandler dialog-dismiss handler"
    - path: "tests/datepicker-and-backhandler.test.tsx"
      provides: "RTL stub tests for DateTimePicker render + BackHandler interception"
  key_links:
    - from: "src/storage/demo.ts"
      to: "src/storage/index.ts barrel"
      via: "barrel demo branch routes through new helper names (listCycles, markPayment, etc.)"
      pattern: "Demo\\.(listCycles|markPayment|upsertCycle)"
    - from: "CreateGroupScreen DateTimePicker"
      to: "@react-native-community/datetimepicker"
      via: "import + onChange handler"
      pattern: "DateTimePicker"
    - from: "DrawScreen useFocusEffect"
      to: "BackHandler.addEventListener('hardwareBackPress', ...)"
      via: "useCallback closure over hasSelectedWinner state"
      pattern: "BackHandler"
tags: [demo, ux-02, ux-03, datepicker, backhandler]
---

<objective>
Reshape the demo storage to the new ChittiGroup schema (memberPhones[]/memberMeta + parallel cycle + payment Maps), wire native DateTimePicker into the two date inputs that aren't yet native, and add hardware-back interception on the four screens that need confirmation before popping. UX-01 is reconciled in SUMMARY only — already shipped.

Purpose: Demo mode is the only working surface on web (per CONTEXT) and the App Reviewer's path to evaluating the product. UX-02 + UX-03 close the three "Native UX" requirements (UX-01 reconciled, UX-02 + UX-03 code-complete in Phase 2; physical-device verification deferred to Phase 5).
Output: Reshaped demo + DateTimePicker on two screens + BackHandler on four screens + RTL stub tests.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/02-multi-user-data-model-security/02-CONTEXT.md
@.planning/phases/02-multi-user-data-model-security/02-RESEARCH.md
@AGENTS.md
@src/storage/demo.ts
@src/storage/index.ts
@src/types/index.ts
@src/lib/theme.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Reshape src/storage/demo.ts to new schema with parallel cycle + payment Maps</name>
  <files>src/storage/demo.ts, src/storage/index.ts</files>
  <read_first>
    - src/storage/demo.ts (current shape with `members: Member[]` + `cycles: Cycle[]` arrays on each group)
    - 02-RESEARCH.md §"Demo Storage Reshape" (lines ~1264-1301 — parallel-Maps pattern + seed example)
    - src/storage/index.ts (Wave 1 barrel — confirm demo branch invocations)
    - src/utils/phone.ts toE164 (Phase 1) — required to normalize the legacy `+91 98765 43210` strings to E.164
    - Additional locked decision #3: demo mode skips audit log writes (appendAudit short-circuits; Demo.listAudit returns [])
  </read_first>
  <action>
    Rewrite `src/storage/demo.ts` end-to-end:

    1. **Module-level stores:**
       ```
       const groupStore = new Map<string, ChittiGroup>();
       const cycleStore = new Map<string, Map<string, Cycle>>();          // gid → cid → Cycle
       const paymentStore = new Map<string, Map<string, Map<string, Payment>>>(); // gid → cid → mid → Payment
       let seeded = false;
       ```

    2. **Helpers exported (mirror real storage modules' shapes so barrel routing stays simple):**
       - `getGroups()`, `getGroupById(id)` — read groupStore
       - `upsertGroup(group)` — set groupStore (used by barrel's demo branch in createGroup / updateGroupMembers)
       - `deleteGroup(id)` — soft-delete: set `groupStore.get(id).isActive = false; deletedAt = new Date().toISOString()` (mirrors real archiveGroup)
       - `listCycles(gid)` — `Array.from(cycleStore.get(gid)?.values() ?? []).sort by cycleNumber`
       - `upsertCycle(gid, cycle)` — set into cycleStore; if `cycle.conducted && cycle.winnerId`: mutate `groupStore.get(gid).memberMeta[winnerId].hasReceived=true, cycleReceived=cycle.cycleNumber`; ensure `prizedMemberIds` includes winnerId
       - `listPayments(gid, cid)` — `Array.from(paymentStore.get(gid)?.get(cid)?.values() ?? [])`
       - `markPayment(gid, cid, mid, mode, note?, paidDate?)` — set into paymentStore with `paid: true, mode, note, paidDate: paidDate ?? new Date().toISOString(), markedByUid: 'demo-user'`
       - `unmarkPayment(gid, cid, mid)` — set `paid: false, markedByUid: 'demo-user'`
       - `listAudit(gid)` — return `[]` (per locked decision #3)

    3. **Seed data (3 groups, schema reshaped):**
       - seedAnnaNagar(): 20 members. Each demo `Member` becomes a `MemberMeta` entry; build `memberPhones: string[]` by `toE164(legacyPhone, 'IN')` for every entry; `memberUids: ['demo-user']`; `foremanUid: 'demo-user'`; `prizedMemberIds: ['m-anjali-sharma', 'm-vikram-rao', 'm-priya-menon', 'm-naveen-kumar']` (matches the prior session's seeded prized state). Use `initializeCycles(group)` to generate 20 cycles, then for cycles 0-3 set conducted=true with winner/discount/foremanCommission/dividend per the prior seedAnnaNagar; for cycle 4 set conducted=false; cycles 5-19 stay empty. Populate `paymentStore.get(id)` for cycles 0-4 to mirror the prior session's `mkPayments(ids, 20|12, paidDate)` (cycles 0-3 all paid; cycle 4 12-of-20 paid). Each Payment record sets `markedByUid: 'demo-user'`.
       - seedOfficeLunch(): 10 members; cycles 0-6 conducted; cycle 7 in-progress (all paid). Apply same reshape.
       - seedSaraswathi(): 0 members; no cycles; pre-members state.

    4. **seedDemoData() / resetDemoData()** — same idempotent + clear-all semantics as today; populate all three stores in seedDemoData; clear all three in resetDemoData.

    5. **Update barrel `src/storage/index.ts`** if needed so demo branches call the new function names (listCycles, markPayment, unmarkPayment, upsertCycle, listAudit). Wave 1 already wrote the barrel; confirm names align — adjust only if signatures drift.

    6. **Web path:** the file MUST compile under `react-native-web`. No native-only imports.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | grep -E "storage/(demo|index)" | tee /tmp/tsc-demo.log; test ! -s /tmp/tsc-demo.log && node -e "const fs=require('fs');const d=fs.readFileSync('src/storage/demo.ts','utf8');for (const s of ['memberPhones','memberMeta','prizedMemberIds','cycleStore','paymentStore','listCycles','markPayment','listAudit','toE164','demo-user']) if(!d.includes(s)){console.error('demo.ts missing '+s);process.exit(1)};if (d.includes('members: Member[]')||d.match(/cycles:\\s*Cycle\\[\\]/)){console.error('demo.ts still uses old shape');process.exit(1)};const seedFn=d.match(/seedAnnaNagar/);if (!seedFn){console.error('seedAnnaNagar missing');process.exit(1)};console.log('ok')" && npm test --silent</automated>
  </verify>
  <acceptance_criteria>
    - src/storage/demo.ts compiles with new ChittiGroup shape; no Member[] / Cycle[] arrays on groups
    - Three top-level Maps: groupStore, cycleStore (gid→cid→Cycle), paymentStore (gid→cid→mid→Payment)
    - Exports: getGroups, getGroupById, upsertGroup, deleteGroup, listCycles, upsertCycle, listPayments, markPayment, unmarkPayment, listAudit, seedDemoData, resetDemoData
    - listAudit returns []
    - All three seeds (Anna Nagar / Office Lunch / Saraswathi) populate; phones normalized to E.164 via toE164
    - HomeScreen + GroupDetail + PaymentTracking + Draw load demo groups without runtime errors (verified by `npm test` if there is a demo-storage unit test; otherwise by inspection — Wave 7 smoke is the integration check)
  </acceptance_criteria>
  <done>Demo storage mirrors the real Firestore shape; web target still compiles; all three seeds load.</done>
</task>

<task type="auto">
  <name>Task 2: Install + wire @react-native-community/datetimepicker on CreateGroup + PaymentTracking</name>
  <files>src/screens/CreateGroupScreen.tsx, src/screens/PaymentTrackingScreen.tsx, package.json</files>
  <read_first>
    - 02-RESEARCH.md §"9.1 UX-02: Native date pickers" (lines ~1302-1336 — install command + DateTimePicker usage pattern)
    - AGENTS.md (Expo SDK 56 pin — use `npx expo install` to get SDK-compatible version)
    - src/screens/CreateGroupScreen.tsx (find current "Starting month" custom day-grid; this gets replaced)
    - src/screens/PaymentTrackingScreen.tsx (find mark-payment sheet/modal; add optional "Paid on" date input)
    - https://docs.expo.dev/versions/v56.0.0/sdk/date-time-picker
  </read_first>
  <action>
    1. **Install:** `npx expo install @react-native-community/datetimepicker` — this pins the SDK-56-compatible version. Do NOT use `npm install`. Verify the installed version in package.json after.

    2. **CreateGroupScreen.tsx — Starting month picker:**
       - Replace the current custom day-grid for "Starting month" with `DateTimePicker mode="date"` per RESEARCH §"9.1" code block (lines ~1314-1332).
       - State: `const [startDate, setStartDate] = useState(new Date()); const [showPicker, setShowPicker] = useState(false);`
       - UI: a Pressable that shows the formatted date `{startDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}` and toggles the picker. The picker mounts conditionally.
       - On change: `setShowPicker(Platform.OS === 'ios')` (iOS stays open until done); if `d`: `setStartDate(d); derive startDay/startMonth/startYear from d`.
       - Imports: `import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';`
       - On submit: ensure `startDate, startDay, startMonth, startYear, paymentDay` all derive from `startDate`.

    3. **PaymentTrackingScreen.tsx — "Paid on" optional date:**
       - In the mark-payment sheet (modal/bottom-sheet where the foreman picks `mode` for an unpaid row), add an optional "Paid on" row with a Pressable + DateTimePicker.
       - State: `const [paidOnDate, setPaidOnDate] = useState<Date | undefined>(undefined); const [showPaidPicker, setShowPaidPicker] = useState(false);`
       - Default: undefined (omitted from markPayment call → storage layer defaults to now)
       - On "Mark paid": pass `paidOnDate?.toISOString()` as the `paidDate` arg to `markPayment(gid, cid, mid, mode, note, paidOnDate?.toISOString())`.

    4. **Web fallback:** `@react-native-community/datetimepicker` has limited web support. Per AGENTS.md / SDK 56 docs the component renders an `<input type="date">` on web; verify no crash on `Platform.OS === 'web'` (demo mode runs on web). If render crashes on web, gate with `Platform.OS !== 'web' ? <DateTimePicker .../> : <input type="date" .../>` or fall back to the previous custom grid for web only.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | grep -E "CreateGroup|PaymentTracking" | tee /tmp/tsc-dp.log; test ! -s /tmp/tsc-dp.log && node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));if (!p.dependencies['@react-native-community/datetimepicker']){console.error('dep missing');process.exit(1)};const cg=fs.readFileSync('src/screens/CreateGroupScreen.tsx','utf8');if (!cg.includes('DateTimePicker')||!cg.includes('@react-native-community/datetimepicker')){console.error('CreateGroup missing DateTimePicker');process.exit(1)};const pt=fs.readFileSync('src/screens/PaymentTrackingScreen.tsx','utf8');if (!pt.includes('DateTimePicker')){console.error('PaymentTracking missing DateTimePicker');process.exit(1)};console.log('ok')"</automated>
  </verify>
  <acceptance_criteria>
    - @react-native-community/datetimepicker in package.json (SDK-56-compatible version, pinned by `expo install`)
    - CreateGroupScreen.tsx renders DateTimePicker for Starting month; state derives startDay/startMonth/startYear/startDate from the picker value
    - PaymentTrackingScreen.tsx renders DateTimePicker for optional "Paid on" inside the mark-payment sheet; value passes through to markPayment as `paidDate`
    - tsc --noEmit clean
    - Both screens compile under react-native-web (no native-only API crashes on web load)
  </acceptance_criteria>
  <done>UX-02 code-complete. Hardware verification on physical iOS+Android deferred to Phase 5 per locked decision.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: useFocusEffect + BackHandler discard/confirm on Draw, CreateGroup, GroupDetail, demo-exit + RTL stub tests</name>
  <files>src/screens/DrawScreen.tsx, src/screens/CreateGroupScreen.tsx, src/screens/GroupDetailScreen.tsx, src/lib/AuthContext.tsx, tests/datepicker-and-backhandler.test.tsx</files>
  <read_first>
    - 02-RESEARCH.md §"9.2 UX-03" (lines ~1338-1379 — pattern + screen behavior table)
    - src/screens/DrawScreen.tsx (find the "selected winner but not confirmed" state)
    - src/screens/CreateGroupScreen.tsx (find form's "has unsaved changes" state — likely an `isDirty` ref or a boolean derived from current vs initial values)
    - src/screens/GroupDetailScreen.tsx (find the delete-confirm Alert.alert; back should dismiss the dialog rather than pop)
    - src/lib/AuthContext.tsx (find leaveDemoMode; on demo-mode exit add confirm)
    - @react-navigation/native useFocusEffect docs
    - React Native BackHandler docs
  </read_first>
  <behavior>
    1. DrawScreen: if `hasSelectedWinner === true && !hasConfirmedDraw`, hardware back shows `Alert.alert('Discard draw?', 'Your selection will be lost.', [{text:'Keep editing',style:'cancel'},{text:'Discard',style:'destructive',onPress:()=>navigation.goBack()}])`; returns `true` to prevent default back. Otherwise returns false (allow default).
    2. CreateGroupScreen: if `hasUnsavedChanges === true` (derive from comparing current form values to initial defaults), same Alert.alert "Discard changes?" pattern.
    3. GroupDetailScreen: if `showDeleteConfirm === true`, hardware-back sets `showDeleteConfirm = false` and returns true (dismiss the dialog instead of popping the screen).
    4. AuthContext / demo-mode exit screen: on demo-mode exit, if there are unsaved changes (or just always confirm exiting demo since "data will be lost"), prompt `Alert.alert('Exit demo?', 'You will lose all demo data.', [...])`. Per RESEARCH §"9.2" this may already be handled by `leaveDemoMode`; verify and adjust.
    5. Pattern: each screen uses `useFocusEffect(useCallback(() => { const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress); return () => sub.remove(); }, [deps]))`. Listener attaches on focus, detaches on blur — critical to avoid multi-screen registration.

    RTL stub tests in tests/datepicker-and-backhandler.test.tsx:
    - Mock `@react-native-community/datetimepicker` as a no-op pass-through (its native module isn't available in jest); render CreateGroupScreen via `@testing-library/react-native`; assert the picker placeholder/trigger Pressable exists with the expected accessibility label or testID.
    - Mock `BackHandler.addEventListener`; render DrawScreen with state set to `hasSelectedWinner=true`; simulate hardware back by manually invoking the registered handler; assert `Alert.alert` was called once with title 'Discard draw?'.
  </behavior>
  <action>
    1. **DrawScreen.tsx:** Add `useFocusEffect` + `BackHandler.addEventListener('hardwareBackPress', onBackPress)` per the pattern in RESEARCH §"9.2". Compute `hasSelectedWinner` from existing screen state (likely a `selectedMemberId` non-null check). Implement the discard prompt; return `true` to swallow back when the prompt is shown.

    2. **CreateGroupScreen.tsx:** Same pattern; compute `hasUnsavedChanges` by comparing form state to initial defaults (a simple ref of initial-values + JSON.stringify diff is sufficient — keep cheap). Discard prompt; return true when prompted.

    3. **GroupDetailScreen.tsx:** Same pattern; intercept when a delete-confirm dialog is open. The existing delete-confirm uses `Alert.alert` — `Alert.alert` cannot be dismissed programmatically on Android. Strategy: replace the `Alert.alert`-based delete confirm with a local Modal component whose visibility is state-driven (`showDeleteConfirm`); on hardware-back when `showDeleteConfirm === true`, set false + return true. If keeping `Alert.alert`, the back-handler simply pops back to the screen (Android closes Alert.alert automatically on back press) — in that case, the only thing to add is a generic "leave this screen" confirm if any other state is dirty (e.g., unsaved member edits). Prefer the Modal-based approach for correctness; document the change.

    4. **AuthContext.tsx / demo exit:** Per RESEARCH §"9.2", `leaveDemoMode` already handles confirmation. Audit it; add `useFocusEffect`-based BackHandler in the appropriate screen (likely HomeScreen when `__demoMode === true`) that calls `Alert.alert('Exit demo?', 'You will lose all demo data.', [...])` when hardware-back fires AND we're at the root demo screen. Only one screen needs the demo-exit handler — pick the demo entry point (HomeScreen).

    5. **iOS swipe-back audit:** Per RESEARCH §"9.2 iOS" — in `AppNavigator.tsx`, for each screen where swipe-back would skip a confirmation (DrawScreen mid-draw, CreateGroupScreen mid-edit, GroupDetailScreen with delete dialog open), set `screenOptions={{ gestureEnabled: false }}` conditionally OR document that the existing useFocusEffect logic does NOT trigger on swipe-back (gesture-back bypasses BackHandler). Lightweight fix: set `gestureEnabled: false` on DrawScreen + CreateGroupScreen entries in the navigator (they shouldn't have swipe-back at all when mid-edit). Document this in SUMMARY.

    6. **tests/datepicker-and-backhandler.test.tsx:**
       - Top: `jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker')` (string mock for RN component)
       - One test: render CreateGroupScreen wrapped in NavigationContainer; assert getByText('Starting month') or the pressable trigger exists
       - One test: render DrawScreen with mocked state; simulate `BackHandler` fire; spy on `Alert.alert` and assert it was called with title 'Discard draw?'
       - Mock `react-native/Libraries/Utilities/BackHandler` to capture registered listener and expose it on a global for the test to invoke
       - Mock `Alert` (`jest.spyOn(Alert, 'alert')`)
       - Optional: one test that confirms `useFocusEffect` registers + cleans up the listener (using `@testing-library/react-native`'s `cleanup`)
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | grep -E "DrawScreen|CreateGroupScreen|GroupDetailScreen|AuthContext|datepicker-and-backhandler" | tee /tmp/tsc-bh.log; test ! -s /tmp/tsc-bh.log && node -e "const fs=require('fs');for (const f of ['src/screens/DrawScreen.tsx','src/screens/CreateGroupScreen.tsx','src/screens/GroupDetailScreen.tsx']) {const c=fs.readFileSync(f,'utf8');if (!c.includes('useFocusEffect')||!c.includes('BackHandler')||!c.includes('hardwareBackPress')) {console.error(f+' missing BackHandler pattern');process.exit(1)}};if (!fs.existsSync('tests/datepicker-and-backhandler.test.tsx')){console.error('test file missing');process.exit(1)};const t=fs.readFileSync('tests/datepicker-and-backhandler.test.tsx','utf8');for (const s of ['Discard draw','DateTimePicker','BackHandler']) if(!t.includes(s)){console.error('test missing '+s);process.exit(1)};console.log('ok')" && npm test -- --testPathPattern=datepicker-and-backhandler --bail</automated>
  </verify>
  <acceptance_criteria>
    - DrawScreen, CreateGroupScreen, GroupDetailScreen each contain `useFocusEffect(useCallback(() => { ... BackHandler.addEventListener('hardwareBackPress', onBackPress) ... return () => sub.remove(); }, [...]))` block
    - DrawScreen discard prompt fires when hasSelectedWinner && !confirmed; CreateGroupScreen discard prompt fires when hasUnsavedChanges; GroupDetailScreen back dismisses delete-confirm modal (or relies on Alert.alert's auto-close + has another dirty-state intercept)
    - Demo-mode exit (in HomeScreen or AuthContext) confirms before exit
    - AppNavigator screen options set gestureEnabled=false on the screens where swipe-back would skip a confirmation (DrawScreen + CreateGroupScreen at minimum)
    - tests/datepicker-and-backhandler.test.tsx exists, mocks DateTimePicker + BackHandler + Alert, has at least 2 tests (DateTimePicker render + BackHandler interception)
    - `npm test -- --testPathPattern=datepicker-and-backhandler` exits 0
  </acceptance_criteria>
  <done>UX-03 code-complete. Hardware-verification on physical Android device deferred to Phase 5 per locked decision.</done>
</task>

</tasks>

<threat_model>
## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-24 | Tampering | demo seeds drift from real schema, masking integration bugs | mitigate | demo storage uses same memberPhones/memberMeta shape; payment + cycle shapes mirror Firestore subcollections |
| T-02-25 | Information Disclosure | demo audit data fabricated, misleading reviewers | mitigate | per additional locked decision #3, listAudit returns []; UI shows empty-state row (Wave 4 wired) |
</threat_model>

<verification>
- tsc --noEmit exits 0
- npm test exits 0 (including new RTL tests)
- Demo mode launches on web target (`react-native-web`); HomeScreen lists 3 seeded chits; GroupDetail loads; mark-payment + conduct-draw + exit-demo flows all work
- CreateGroupScreen + PaymentTrackingScreen render DateTimePicker on iOS + Android EAS dev build (verified visually; physical hardware verification deferred per locked decision)
- Hardware-back on DrawScreen / CreateGroupScreen / GroupDetailScreen triggers expected confirmations in Android emulator
</verification>

<success_criteria>
A reviewer launches the app via the web demo preview and sees three chits, full ledgers, audit empty-state, and Activity tab populated for non-demo (Wave 4). The CreateGroup form uses a native date picker. Pressing Android hardware-back mid-draw prompts "Discard draw?" — same on mid-edit of CreateGroup.
</success_criteria>

<output>
After completion, create `.planning/phases/02-multi-user-data-model-security/02-06-demo-reshape-and-ux02-ux03-code-SUMMARY.md` recording: demo schema diff, DateTimePicker integration notes (web fallback if used), BackHandler-wired screens, UX-01 RECONCILIATION (already shipped prior session — no new code), UX-02 + UX-03 CODE-COMPLETE marker with "physical-device verification deferred to Phase 5" caveat.
</output>
