# Replace hand-rolled offline-sync layer with TanStack Query

## Problem

The frontend has no actual PWA/service-worker caching, despite the app
being framed that way. What exists instead is a hand-rolled offline-first
sync engine spread across several files, totaling roughly 1,500+ lines:

- `frontend/src/services/syncQueue.js` (349 lines) — localStorage-backed
  operation queue with manual retry/backoff/dedup/id-remapping
- `frontend/src/stores/books.js` (497 lines) — mixes UI state, localStorage
  caching, backend loading, and sync orchestration
- `frontend/src/stores/settings.js` (325 lines) — duplicates most of the
  same pattern as `books.js` for a different resource
- `frontend/src/services/migration.js` (152 lines) — one-time guest→backend
  data migration
- `frontend/src/composables/useOnlineStatus.js` (132 lines) — combines
  `navigator.onLine` and API-availability into one signal
- `frontend/src/services/guestMode.js` (41 lines)
- Sync-status UI: `frontend/src/components/SyncStatusIndicator.vue` and
  `frontend/src/composables/useSyncNotifications.js`

This is unreliable in practice (the motivation for this change) and is
exactly the class of problem (queueing, retry, dedup, id-remapping) that
is notoriously hard to hand-roll correctly.

**Confirmed requirements** (from brainstorming):
- Offline *editing* is not a real product requirement. Users don't expect
  changes made offline to queue and sync later.
- A fast-loading cache (show last-seen data immediately, refresh in
  background) is still wanted.
- Guest mode (use the app with no account, data local-only) must be kept.
- No multi-client concurrent editing — realtime subscriptions are
  unnecessary overhead and are explicitly out of scope.
- Willing to add one well-known dependency if it meaningfully shrinks and
  simplifies the code.

## Goals

- Replace the hand-rolled cache/retry/queue machinery with TanStack Query
  (`@tanstack/vue-query`), a well-known, actively maintained library.
- Cut the sync-related code significantly while keeping behavior mentally
  simple: reads are cached and revalidated in the background; writes
  either succeed or fail visibly — no hidden queue.
- Keep guest mode and the guest→account migration working.
- Keep the existing book/settings domain behavior (fields, transforms,
  PocketBase API surface) unchanged — this is a data-layer restructuring,
  not a feature change.

## Non-goals

- No offline write queue, retry-with-backoff, or optimistic id-remapping
  across page reloads.
- No realtime PocketBase subscriptions.
- No changes to the PocketBase schema, migrations, or backend.
- No visual/UX redesign beyond what naturally falls out of simplifying
  `SyncStatusIndicator`.

## Architecture

### New dependency

Add `@tanstack/vue-query` (~13kb). It provides, out of the box:
- `useQuery` — caching, background refetch, retry-on-failure, loading/error
  state for reads.
- `useMutation` — write operations with optional optimistic updates via
  `onMutate`/`onError` rollback.
- `useIsFetching()` / `useIsMutating()` — global in-flight indicators,
  replacing hand-tracked `syncStatus` fields.
- A persistence plugin (`@tanstack/query-sync-storage-persister` +
  `persistQueryClient`) that restores the cache from localStorage on load
  and revalidates in the background — replacing the manual
  `saveToLocalStorage`/`loadFromLocalStorage` pairs in both stores.

`useOnline()` from `@vueuse/core` (already a dependency, currently unused)
replaces `useOnlineStatus.js` for raw network status.

### Query client setup

`frontend/src/main.js` creates one `QueryClient` and installs
`VueQueryPlugin`, with `persistQueryClient` wired to a localStorage
persister (namespaced key, e.g. `readtrail-query-cache`). Query defaults:
`retry: 2` for reads (network hiccups self-heal), `retry: false` for
mutations (fail loud, let the user retry the action).

### API layer (`booksApi.js` / `settingsApi.js`)

Unchanged in spirit: still the thing `queryFn`/`mutationFn` call into.
Each method's existing `isGuestMode()` branch is extended so that, for
guests, reads/writes go to a small local-only store
(`frontend/src/services/guestStore.js`, new, replacing the localStorage
reads currently embedded in `stores/books.js`/`stores/settings.js`)
instead of PocketBase. From TanStack Query's point of view this is
invisible — same `queryFn`/`mutationFn` contract for guest and
authenticated users, so one set of composables serves both.

### Composables (new, replacing store internals)

- `useBooksQuery()` — wraps `useQuery(['books'], booksApi.getBooks)`
- `useCreateBook()`, `useUpdateBook()`, `useDeleteBook()` — `useMutation`,
  each with an `onMutate` optimistic update against the `['books']` cache
  entry and `onError` rollback. This replaces the current tempId +
  `syncQueue` dance with TanStack Query's documented optimistic-update
  pattern.
- `useSettingsQuery()` / `useUpdateSetting()` — same shape, singular
  settings object instead of a list.

### Pinia stores

`stores/books.js` and `stores/settings.js` shrink to thin wrappers that
expose the above composables under the store's existing public API
(`sortedBooks`, `addBook`, `updateBookStatus`, etc.) so that consuming
components/views require minimal changes. All state ownership
(`books`, `syncStatus`, `lastSyncTime`, `pendingIdMap`, `pendingFiles`
tracking, manual load/save) moves into Query's cache and is deleted from
the stores.

### Migration (guest → account)

Kept, simplified: on successful login/register, if the guest store has
books, a single mutation calls `booksApi.batchCreateBooks` (existing
duplicate-matching logic in `migration.js` is kept as-is since it's cheap
and handles a real edge case — re-login on the same device). On success,
the guest store is cleared and `['books']`/`['settings']` queries are
invalidated so they refetch from the backend.

### Sync status UI

`SyncStatusIndicator.vue` and `useSyncNotifications.js` are rewritten
against `useIsFetching()`, `useIsMutating()`, and `useOnline()` instead of
reading `syncQueue`/store `syncStatus`. Same visual states (offline /
syncing / error), simpler derivation, no dependency on the removed queue.

### What gets deleted entirely

- `frontend/src/services/syncQueue.js`
- `frontend/src/composables/useOnlineStatus.js`
- The hand-rolled localStorage load/save, migration-flag bookkeeping, and
  `pendingIdMap`/queue-processing logic inside both stores

## Data flow (books, authenticated user)

1. App loads → `persistQueryClient` restores `['books']` from localStorage
   synchronously → UI renders instantly with last-seen data.
2. `useBooksQuery()` triggers a background refetch via `booksApi.getBooks()`
   → cache updates when it resolves; persister writes the new cache to
   localStorage automatically.
3. User adds a book → `useCreateBook()` mutation fires → `onMutate`
   optimistically appends the book to the `['books']` cache with a temp id
   → `booksApi.createBook()` runs → on success, temp entry is replaced with
   the real record (cache update, no manual `pendingIdMap`); on failure,
   `onError` rolls back the optimistic entry and a toast reports the
   failure — no queue, no retry loop.
4. Offline: `useOnline()` is false → mutation is attempted, fails fast
   (network error) → same `onError` rollback + toast path. No special
   offline branch needed.

## Testing

- Existing unit tests for `booksApi`/`settingsApi` transforms stay valid
  (API shape unchanged).
- Tests for `syncQueue.js`, `useOnlineStatus.js`, and the deleted store
  internals are removed along with the code.
- New tests: `useBooksQuery`/mutation composables (success, error,
  optimistic-rollback paths) and the guest-store branch, using Vue Query's
  test utilities (`VueQueryPlugin` with a fresh `QueryClient` per test,
  `retry: false`).
- Manual verification: guest mode add/edit/delete, login migration of
  guest books, simulated offline mutation failure + toast, cache-restore
  on reload (throttled network in devtools).
