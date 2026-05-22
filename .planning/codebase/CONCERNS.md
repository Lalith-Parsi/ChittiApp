# Codebase Concerns

**Analysis Date:** 2026-05-22

## Tech Debt

**Storage shim layer:**
- Issue: `src/storage/index.ts` is documented as a "shim" that delegates to Firestore. The indirection (storage → firestore) exists for legacy reasons and adds an extra layer for every CRUD call without providing offline caching or batching.
- Files: `src/storage/index.ts`, `src/lib/firestore.ts`
- Impact: Two parallel module surfaces (`../storage` vs `../lib/firestore`) — `AddMemberScreen.tsx` imports from both. Adds confusion about which is canonical.
- Fix approach: Either eliminate the shim and import `firestore.ts` directly, or invert it so screens go through `storage` only (then `saveMemberToken` should be re-exported from there too).

**`stripUndefined` via JSON serialization:**
- Issue: `src/lib/firestore.ts:21-23` uses `JSON.parse(JSON.stringify(obj))` to strip `undefined` fields before writes.
- Impact: Silently drops `Date`, `Map`, `Set`, functions, and converts them to ISO strings or empty objects. Anything non-JSON-serializable in `ChittiGroup` (currently none — but fragile when extending the model) is corrupted on save.
- Fix approach: Use Firestore's `{ ignoreUndefinedProperties: true }` setting on `initializeFirestore`, or recursively delete `undefined` keys in place.

**Full-document writes for every mutation:**
- Issue: `upsertGroup` writes the entire `ChittiGroup` (members + all cycles + all payments) on every change — toggling a single payment rewrites the whole document. See `src/screens/PaymentTrackingScreen.tsx:53-77` and `src/screens/DrawScreen.tsx:77-92`.
- Impact: Wasteful Firestore writes, race conditions when two devices mutate concurrently (last-write-wins clobbers concurrent edits), and approaches the 1 MB per-document limit as cycles grow.
- Fix approach: Move cycles and payments to subcollections; use `updateDoc` with field paths or `arrayUnion`/`arrayRemove`; consider Firestore transactions.

**Duplicate `ordinal` helper:**
- Issue: `ordinal()` is reimplemented in `src/screens/CreateGroupScreen.tsx:20-23`, `src/screens/PaymentTrackingScreen.tsx:13-16`, `src/screens/MemberDetailScreen.tsx:16-19`, `src/screens/MemberPublicViewScreen.tsx:14-17`, and `src/components/GroupCard.tsx:9-13`.
- Fix approach: Extract into `src/utils/format.ts`.

**Inline `sendWhatsApp` duplication:**
- Issue: WhatsApp message construction exists in both `src/screens/PaymentTrackingScreen.tsx:18-24` and `src/screens/MemberDetailScreen.tsx:51-56`.
- Fix approach: Centralize in `src/utils/whatsapp.ts`.

**No central error handling / `alert()` everywhere:**
- Issue: `alert(...)` and `window.confirm(...)` are used directly in screens (`HomeScreen.tsx:27-28`, `GroupDetailScreen.tsx:50,57,64`, `PaymentTrackingScreen.tsx:66,73`, `CreateGroupScreen.tsx:68-72,92`, `AddMemberScreen.tsx:32-33,57`, `DrawScreen.tsx:60,71`).
- Impact: `window.alert`/`window.confirm` only work on web — silently no-ops or crashes on native. The `typeof window !== 'undefined'` guard in `GroupDetailScreen.tsx` short-circuits to "accept" on native, meaning destructive operations (delete group, archive, remove member) have **no confirmation prompt on iOS/Android**.
- Fix approach: Use React Native `Alert.alert` from `react-native` consistently, or a cross-platform confirm component.

## Known Bugs

**Destructive actions auto-confirm on native:**
- Symptoms: Tapping delete/archive on iOS/Android skips the confirmation dialog and proceeds immediately.
- Files: `src/screens/HomeScreen.tsx:27-31`, `src/screens/GroupDetailScreen.tsx:49-70`, `src/screens/PaymentTrackingScreen.tsx:66,73`
- Trigger: Run on iOS/Android, tap any trash icon or "All Paid" / "Unmark".
- Workaround: None — must be on web for the confirm to appear.

**Phone auth is web-only:**
- Symptoms: Phone OTP login fails on iOS/Android.
- Files: `src/screens/LoginScreen.tsx:38-42`
- Cause: Uses `window.recaptchaVerifier` and `RecaptchaVerifier` from `firebase/auth`, which require a DOM `recaptcha-container` element (`nativeID="recaptcha-container"` on line 108 — `nativeID` is not rendered as a DOM `id` on native).
- Workaround: Sign in with Google on native (also relies on `signInWithPopup` which is web-only — see next bug).

**Google sign-in is web-only:**
- Symptoms: `signInWithPopup` is not available on React Native.
- Files: `src/screens/LoginScreen.tsx:22-31`
- Cause: `signInWithPopup` requires a browser window. On native it throws "auth/operation-not-supported-in-this-environment".
- Workaround: Use `expo-auth-session` (already in `package.json`) with the Google provider to get an ID token, then `signInWithCredential`.

**Auction tie-breaking picks an arbitrary winner:**
- Symptoms: When two members enter the same minimum bid, `Array.find` returns the first match by member order, not by bid order.
- Files: `src/utils/chitti.ts` (none here — bug is in) `src/screens/DrawScreen.tsx:69-75`
- Cause: `valid.find(b => parseInt(b.bid) === min)` ignores time-of-bid; no tie-break UX.
- Fix: Detect ties and prompt user, or use insertion order explicitly.

**`getCycleMonth` falls back to invalid `Date` parsing:**
- Symptoms: For groups created before `startMonth`/`startYear` existed (`startDate` only), `new Date(group.startDate).getMonth()` works, but `getCurrentCycle`/initialization assumes the field shape.
- Files: `src/utils/chitti.ts:39-44`
- Trigger: Loading a legacy group without `startMonth`/`startYear`.
- Workaround: Re-edit group in `CreateGroupScreen` to backfill.

**Cycle re-initialization clobbers `totalMembers`:**
- Symptoms: `GroupDetailScreen.tsx:29-36` resets `totalMembers = g.members.length` on every focus. If `durationMonths` was set higher than members, totalMembers no longer represents the planned group size.
- Files: `src/screens/GroupDetailScreen.tsx:29-36`
- Impact: `totalMembers` field becomes meaningless — and `initializeCycles` already uses `group.totalMembers` to compute `winAmount = group.amount * group.totalMembers` (`src/utils/chitti.ts:10`), so wrong values propagate.

**`winAmount` uses `totalMembers` instead of `members.length`:**
- Symptoms: If `totalMembers !== members.length` (e.g., planned 20 but only 18 joined), `initializeCycles` computes `winAmount = amount * 20`, but `DrawScreen` uses `totalPool = amount * members.length = amount * 18`.
- Files: `src/utils/chitti.ts:10`, `src/screens/DrawScreen.tsx:55`
- Impact: Pre-computed `winAmount` is overwritten on confirm with the actual pool, but stale lottery `winAmount` is displayed on cycle cards until conducted.

**Stale cycle data after editing group `durationMonths`:**
- Symptoms: Editing duration in `CreateGroupScreen` does not re-initialize cycles. `GroupDetailScreen` only re-inits when `g.cycles.length !== g.durationMonths`.
- Files: `src/screens/CreateGroupScreen.tsx:77-80`, `src/screens/GroupDetailScreen.tsx:29-36`
- Impact: Reducing duration with already-conducted cycles silently drops historical data on next focus.

**`alert` is not defined on native:**
- Symptoms: `alert('...')` calls crash with `ReferenceError: alert is not defined` on some native runtimes.
- Files: `src/screens/CreateGroupScreen.tsx:68,70,71,72,92`, `src/screens/AddMemberScreen.tsx:32,33,57,59`, `src/screens/DrawScreen.tsx:60,71`, `src/screens/MemberDetailScreen.tsx:60`.
- Fix: Replace with `Alert.alert` from `react-native`.

**Deep-link host is wrong for production:**
- Symptoms: Universal links use `https://chitti-app-edfb1.web.app`.
- Files: `src/navigation/AppNavigator.tsx:21`
- Impact: If hosted elsewhere (custom domain), links won't open. Also missing Android intent filters / iOS associated domains configuration in `app.json`.

## Security Considerations

**Hardcoded Firebase API key in source:**
- Risk: API key committed to `src/lib/firebase.ts:5-12` and to git.
- Files: `src/lib/firebase.ts`
- Current mitigation: None. Firebase Web API keys are technically public-by-design, but they MUST be protected by Firestore security rules and App Check, neither of which is referenced in the repo.
- Recommendations: Add `firestore.rules` enforcing `request.auth.uid == userId` on `users/{userId}/groups/{groupId}`. Enable Firebase App Check. Restrict the API key in Google Cloud Console to specific bundle IDs and HTTP referrers. Move config to `app.json` `extra` or `EXPO_PUBLIC_*` env vars.

**Public `memberTokens` collection is unauthenticated:**
- Risk: `getGroupByMemberToken` (`src/lib/firestore.ts:34-40`) reads `memberTokens/{token}` and then the group document. The `MemberPublicView` route is rendered for unauthenticated users (`src/navigation/AppNavigator.tsx:60`).
- Impact: Anyone with a token URL sees full member names, phone numbers, payment history, and group financials. Tokens are UUIDv4 (good entropy), but there is no expiry, no revocation, no rate limiting, and `member.phone` of every member in the group is exposed.
- Recommendations: Limit the public view to ONLY the requesting member's data (filter out other members' PII). Add token expiry, revocation list, and rate limiting via Cloud Functions or App Check. Consider scoping firestore.rules to allow `get` (not `list`) on `memberTokens` and a single-field read on the group.

**Firestore security rules not in repo:**
- Risk: No `firestore.rules` file exists. If default "test mode" rules are in use, the entire database is world-readable/writable until 30 days post-creation, then locked.
- Files: (missing) `firestore.rules`
- Recommendations: Add and deploy rules. Restrict `users/{uid}/groups/**` to `request.auth.uid == uid`. Restrict `memberTokens/**` to read-only by token (no list).

**PII exposure on shared link:**
- Risk: `MemberPublicViewScreen.tsx` displays every other member's amount totals as part of "Total paid" sum (`totalPaid * group.amount`) and other members exist within `group.members`. The screen only renders the recipient, but the full member array is loaded client-side.
- Files: `src/screens/MemberPublicViewScreen.tsx:31-37`
- Recommendations: Backend should return a redacted projection of the group document for public views.

**No input sanitization for WhatsApp messages:**
- Risk: `member.name` and `group.name` are interpolated into a URL after `encodeURIComponent`. Encoding mitigates URL injection, but a malicious group name could craft a misleading message body.
- Files: `src/screens/PaymentTrackingScreen.tsx:18-24`, `src/screens/MemberDetailScreen.tsx:51-56`
- Recommendation: Validate group/member names against a reasonable charset on input.

**Phone number stored in plain text without verification:**
- Risk: Members' phone numbers are stored in plain text in Firestore and exposed via public token links.
- Files: `src/types/index.ts:5`, `src/screens/AddMemberScreen.tsx:40-43`
- Recommendation: Hash on storage if not needed in plaintext; otherwise note in privacy disclosure.

## Performance Bottlenecks

**Full document re-fetch + re-write on every payment toggle:**
- Problem: `togglePayment`, `markAllPaid`, `unmarkAllPaid` rewrite the entire group document.
- Files: `src/screens/PaymentTrackingScreen.tsx:53-77`
- Cause: No partial updates.
- Improvement path: Use `updateDoc` with `cycles.<idx>.payments` or move payments to a subcollection.

**`useFocusEffect` re-fetches whole group on every screen focus:**
- Problem: `GroupDetailScreen` fetches and conditionally rewrites the document on every focus.
- Files: `src/screens/GroupDetailScreen.tsx:26-41`
- Cause: No caching; the "re-init cycles" branch can fire spuriously.
- Improvement path: Use Firestore `onSnapshot` listeners or a local cache + revalidation.

**Lottery animation uses `setInterval` without cleanup:**
- Problem: `setInterval` in `runLottery` is only cleared after 15 ticks; no cleanup if user navigates away mid-spin.
- Files: `src/screens/DrawScreen.tsx:62-67`
- Cause: Missing `useEffect` cleanup or `useRef` for the interval id.
- Improvement path: Store interval id in a ref and clear on unmount.

**Style sheets rebuilt every render:**
- Problem: `makeStyles(colors)` runs on every render via `useMemo([colors])`. OK, but `StyleSheet.create` is called inside the memo — fine, but recreates on theme toggle.
- Files: All screen files.
- Improvement path: Acceptable; flagged for awareness.

## Fragile Areas

**Cycle <-> member synchronization logic:**
- Files: `src/utils/chitti.ts:15-19` (`syncCyclePayments`), `src/screens/GroupDetailScreen.tsx:29-36`, `src/screens/AddMemberScreen.tsx:48-55`
- Why fragile: Cycles must be re-synced whenever members change. There are at least three different sync paths (add member, delete member, focus-refresh) and each handles `totalMembers`, `cycles.length`, and `payments` slightly differently.
- Safe modification: Extract a single `reconcileGroup(group)` function and call from one place after every mutation.
- Test coverage: Zero.

**Auth-required `storage` shim:**
- Files: `src/storage/index.ts:7-11`
- Why fragile: Every storage call throws synchronously if `auth.currentUser` is null. Race condition: user signs out mid-screen, a queued `setGroup`/`useFocusEffect` fires, app crashes with unhandled "Not authenticated".
- Safe modification: Guard in callers or have shim resolve to empty/no-op when unauthenticated.

**Navigator unmounts/remounts screens on auth state change:**
- Files: `src/navigation/AppNavigator.tsx:46-62`
- Why fragile: Switching the `Stack.Screen` set when `user` changes (sign-out during a screen with in-flight Firestore promises) can throw "Component has been unmounted" warnings and lose state.

**No error boundary:**
- Files: Entire `App.tsx`
- Why fragile: Any thrown render error crashes the whole app with a white screen on production builds.
- Fix: Wrap in a React `ErrorBoundary`.

## Scaling Limits

**Firestore 1 MB per-document cap:**
- Current capacity: One `ChittiGroup` document holds all members + all cycles + all payments.
- Limit: Per-payment record is ~80 bytes. A group with 30 members × 30 cycles = 900 payments = ~72 KB just for payments. Adding history fields (paidDate) and metadata pushes a 50-member, 50-month group toward ~250 KB. Hard ceiling 1 MB.
- Scaling path: Split cycles into a subcollection `users/{uid}/groups/{gid}/cycles/{cid}`.

**No pagination on group list:**
- Current capacity: `getGroups` fetches ALL groups for the user.
- Files: `src/lib/firestore.ts:11-14`, `src/screens/HomeScreen.tsx:24`
- Scaling path: Add `query(..., limit(20), orderBy('createdAt', 'desc'))` and infinite scroll.

**Single Firestore region:**
- Risk: No multi-region failover noted.

## Dependencies at Risk

**`uuid@14.0.0`:**
- Risk: `uuid` v14 requires Node 20+ and ESM-only in some environments. With Metro bundler and `react-native-get-random-values`, compatibility is workable but version pinning to a major that recently broke API may surprise.
- Migration plan: Pin to a tested version (e.g., `^9` or `^11`) used widely in RN ecosystem, or use `expo-crypto` (already a dep) `randomUUID()`.

**`@react-native-async-storage/async-storage@^3.1.0`:**
- Risk: v3 is current but some peer-deps in Expo SDK 56 may expect v2.x. Verify alignment with `expo install` recommendations.

**React 19.2.3 + React Native 0.85.3:**
- Risk: RN 0.85 is bleeding-edge; many libraries (`@react-navigation/*` v7) still warn against React 19 strict mode.

**`firebase@^12.13.0` Web SDK on React Native:**
- Risk: Using the web Firebase SDK in RN works for Firestore but has known issues with Auth persistence (`getAuth(app)` without `initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })`).
- Files: `src/lib/firebase.ts:16`
- Impact: Auth state is NOT persisted across app restarts on native — user must re-login every cold start.
- Migration plan: Use `initializeAuth` with `getReactNativePersistence(AsyncStorage)` for native, fall back to `getAuth` on web.

## Missing Critical Features

**No offline support:**
- Problem: All reads/writes go straight to Firestore. App is unusable without internet.
- Blocks: Field use cases in low-connectivity areas.
- Fix: Enable Firestore offline persistence (`enableIndexedDbPersistence` on web, native auto-enabled in v9+).

**No backup / export:**
- Problem: No way to export group data to CSV/PDF.
- Blocks: Audit trails, member receipts.

**No notifications:**
- Problem: WhatsApp reminders are manual. No automated reminders on payment day.
- Blocks: Reducing missed payments.

**No multi-user collaboration:**
- Problem: Each group is owned by one `uid`. Co-organizers cannot share access. Member tokens are read-only.
- Blocks: Shared group management.

**No audit log:**
- Problem: No history of who changed what (e.g., who marked a payment paid, who deleted a member).
- Blocks: Dispute resolution.

**No firestore.rules / firebase.json / firestore.indexes.json in repo:**
- Problem: Backend config is not version-controlled.
- Files: (missing)
- Recommendation: Add Firebase project config under `firebase/`.

**No tests at all:**
- Problem: Zero test files, no test runner configured in `package.json`.
- Files: `package.json` (no `test` script, no jest/vitest dep)
- Blocks: Safe refactors, regression detection.

**No linter / formatter:**
- Problem: No `.eslintrc`, `.prettierrc`, or `biome.json`.
- Blocks: Consistent code style enforcement.

**No CI:**
- Problem: No `.github/workflows/`, no CI checks.
- Blocks: Automated quality gates.

## Test Coverage Gaps

**100% of code is untested.**

Highest-priority untested areas:

- `src/utils/chitti.ts` — Pure functions, easy to unit test (`initializeCycles`, `syncCyclePayments`, `calculateDividend`, `getCycleMonth`).
  - Risk: Silent math errors in dividend or cycle calculations.
  - Priority: **High**.

- `src/lib/firestore.ts` — Auth-gated CRUD and `stripUndefined` quirks.
  - Risk: Document corruption, silent failures.
  - Priority: **High**.

- `src/screens/DrawScreen.tsx` — Winner selection, auction tie-breaking, confirm logic.
  - Risk: Wrong winner recorded, dividend miscalculated.
  - Priority: **High**.

- `src/screens/PaymentTrackingScreen.tsx` — Payment toggle, mark-all, unmark.
  - Risk: Payments toggled incorrectly across cycles.
  - Priority: **Medium**.

- `src/navigation/AppNavigator.tsx` — Auth-gated routing and deep-link parsing.
  - Risk: Public/private route leakage.
  - Priority: **Medium**.

- E2E coverage: zero. Adding Detox or Maestro for "create group → add member → conduct draw → mark payments" smoke flow is recommended.

---

*Concerns audit: 2026-05-22*
