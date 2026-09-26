# Cover image cache — design

## Problem

Book cover images are currently never deduplicated. When a book is added via
OpenLibrary search, only `cover_url` (a live hotlink) is stored — nothing is
downloaded. When a user edits a cover via the "Edit Cover" modal, the
**browser** fetches the image over CORS, validates it, and uploads it as that
book's own private `cover_file`. Two users adding the same popular book each
store their own independent copy of the same bytes; there is no sharing
across books or users.

**Goal:** when many users add the same book (the common case for anything
popular), store the cover image's bytes exactly once, keyed by URL and by
content hash, in a shared collection — cutting storage growth as the user
base grows.

## Data model

### New collection `cover_images`

| field | type | notes |
|---|---|---|
| `file` | file (1, thumb `200x300`) | the image bytes; same 512KB cap as today |
| `source_url` | url, optional | set when the image came from a URL; empty for hash-only entries. Plain (non-unique) index — a cache-lookup shortcut, not the uniqueness guarantee |
| `hash` | text, required | SHA-256 hex of the file bytes. **Unique index** — the real dedup key, since identical bytes can arrive via different URLs (or none) |
| `ref_count` | number, required, default 0 | how many `books` currently reference this row |

Access rules:
- `createRule` / `updateRule` / `deleteRule`: unset (superuser-only via API).
  Nothing ever writes to this collection through the public REST API — only
  hook code (running with full app access) creates/updates/deletes rows.
- `listRule` / `viewRule`: public (empty-string rule). Book covers aren't
  sensitive, and this must be readable across owners since dedup is
  cross-user by design. This makes the collection world-readable-by-id
  (nothing links to a row except through a book the requester can already
  see, but the row itself isn't access-controlled).

### `books` collection changes

- Remove `cover_file` (replaced by the shared/dedup'd storage below).
- Add `cover_image`: relation → `cover_images`, single, optional,
  `cascadeDelete: false`. Not a DB cascade deliberately — deleting a book
  must only *decrement* the shared image's `ref_count` and delete it only
  when that count reaches zero, not blindly delete it while other books
  still reference it. That logic lives in hook code, not the schema.
- Keep `cover_url` unchanged: a denormalized text/url field recording the
  last URL the user entered, used for cheap prefill (e.g. reopening the Edit
  Cover modal) without an `expand`. The image actually displayed always
  comes from `cover_image` → `cover_images.file`, falling back to `cover_url`
  as a live hotlink when no cached copy exists.

No production data needs to be preserved (the database can be recreated), so
migrations make these changes directly with no backfill step.

## Backend flow

New `backend/pb_hooks/coverImages.pb.js` (thin wiring) +
`backend/pb_hooks/coverImages.js` (pure, unit-tested logic), following the
same split established for `bookSearch.js`/`bookSearch.pb.js`.

### Trigger points

- `onRecordCreate("books")` / `onRecordUpdate("books")` — before-save hooks.
  For updates, `e.record.original()` gives the pre-change values so the
  resolve logic only runs when `cover_url` actually changed.
- `onRecordAfterDeleteSuccess("books")` — decrements the old `cover_image`'s
  `ref_count` after the book is actually gone, so a failed delete never
  double-decrements.
- `POST /api/books/:id/cover` (new `routerAdd`) — accepts a multipart file
  upload for an existing book. Requires `e.auth` and that the requester owns
  the book (403 otherwise). Used by the Edit Cover modal, and by the
  frontend's fallback flow (see below).

### Resolve algorithm (pure, unit-tested)

1. A new/changed `cover_url` is present → look up `cover_images` by
   `source_url` (exact match). Hit → reuse it.
2. Miss (or no `cover_url` — i.e. a raw upload via the `/cover` endpoint) →
   obtain the bytes (server-side download for case 1's miss, or the
   uploaded file for the `/cover` endpoint), reject up front on the
   guardrails below, hash them (SHA-256), and look up by `hash`. Hit → reuse
   (this is what catches "same image, different or no URL"). Miss →
   validate (size/MIME/magic-bytes) and create a new `cover_images` row.
3. **Ref-counting is centralized and separate from resolving.** Any code
   path that changes a book's `cover_image` — the create/update hook
   resolving a URL, or the `/cover` endpoint after a hash-dedup — just sets
   the relation. One shared routine, run in the same hook and keyed only on
   the before/after `cover_image` value, diffs old vs new and
   increments/decrements/deletes-at-zero accordingly. Nothing computes
   ref-counts in two places.
4. **A cover-fetch failure never blocks saving the book.** `cover_url` alone
   is always a valid, saveable state — that's today's behavior. If the
   server-side download fails for any reason (network, timeout, guardrail
   block, invalid content), the hook simply leaves `cover_image` unset and
   the book save proceeds normally. Whether caching actually happened is
   just an inspectable fact on the response (`cover_url` set, `cover_image`
   empty) — no special error-code plumbing needed for this path.

### Guardrails on server-side download

- Scheme allowlist: only `http:` / `https:`.
- Block obviously-internal targets: literal loopback/private/link-local IPs
  (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`,
  `169.254.0.0/16`, and IPv6 equivalents) and hostnames like
  `localhost`/`*.local`. This is a pragmatic filter, not exhaustive
  DNS-rebinding protection — full rebinding-proof SSRF defense is
  disproportionate for a self-hosted, small-trusted-user app, and
  `$http.send` doesn't expose redirect-following control, so a
  redirect-based bypass is an accepted residual risk here.
- 10s timeout (matching the search endpoint) and the same 512KB size cap
  enforced during download (abort early on an oversized `Content-Length`,
  hard-stop if the body exceeds it regardless).
- Same MIME allowlist + magic-byte validation as today's client-side
  `imageFetcher.js`, ported server-side (so it can't be bypassed by a
  modified client) and unit-tested as pure functions.

### `/cover` endpoint errors (human-readable)

This is the only place a hard failure needs to reach the user — the
create/update path degrades silently (see point 4 above).

| situation | status | `data.code` | message |
|---|---|---|---|
| upload fails size cap | 422 | `cover_too_large` | "Image is too large (max 512KB)." |
| upload fails MIME/magic-byte validation | 422 | `cover_invalid_format` | "That doesn't look like a supported image (JPEG, PNG, GIF, WebP, BMP)." |

## Frontend integration

- **Add via search / any `cover_url`-only create or update**: sent exactly
  as today (JSON, no file, no client fetch). After a successful
  create/update, if the returned book has `cover_url` but no `cover_image`,
  the frontend fires off the existing client-side fetch (`imageFetcher.js`,
  unchanged) in the background, and on success uploads the result to
  `POST /api/books/:id/cover`. This is fire-and-forget — book creation is
  already optimistic (the store shows the book instantly), so this
  background step is invisible unless/until it resolves a cover. If the
  client-side fetch also fails, the book keeps its live hotlink — same as
  today, not a regression.
- **Edit Cover modal**: UX is unchanged — it already eagerly fetches and
  validates client-side as the user types (spinner, inline error, disabled
  Save on failure, all untouched). The only change is where the resulting
  file goes on Save: `POST /api/books/:id/cover` instead of attaching it
  directly as the book's own file (removed). Deliberately not trying the
  server-side download first here — a pasted custom URL is a low-value dedup
  target (usually unique to that user), and this flow already has solid,
  tested UX not worth touching further.
  This does change the save sequence from one PocketBase multipart update
  (today: `cover_url` + file together) to two calls: the normal book update
  (`cover_url` and any other edited fields) followed by the `/cover` upload.
  If the first succeeds and the second fails, the book keeps its new
  `cover_url` as a live hotlink with no cached file — the same
  graceful-degradation behavior as the search-add fallback path, not a new
  failure mode.
- `booksApi.js`: `getList`/`getOne`/`create`/`update` calls add
  `{ expand: 'cover_image' }`; `transformBookFromPocketBase` builds
  `coverDisplayLink` from the expanded file, falling back to `cover_url`
  when `cover_image` is empty (same priority as today's file-vs-url
  fallback).

## Testing strategy

- **Backend pure logic** (`coverImages.js`): guardrail checks
  (scheme/private-IP rejection), size/MIME/magic-byte validation (ported
  from `imageFetcher.js`), and the ref-count diffing logic — all pure
  functions with DB/network access injected as parameters — unit-tested
  with the vitest harness already set up in `backend/package.json`
  (established for `bookSearch.js`).
- **`coverImages.pb.js` / the `/cover` route wiring**: thin, untestable
  without the real PocketBase binary, same as every other `pb_hooks` route.
  Verified manually against a running PocketBase container: url-hit dedup,
  hash-hit dedup, a genuinely new image, `ref_count` reaching zero and
  deleting the row, and a book delete cascading the decrement.
- **Frontend**: vitest for `booksApi.js` (the `expand` addition, the
  `coverDisplayLink` fallback priority), for the new "ensure cover cached"
  fallback logic (mocking `fetch` and the `/cover` upload call), and updated
  `BookCoverModal` tests for the new upload target.
- **e2e**: existing tests are unaffected (search results are mocked empty,
  so they never exercise the cover-fetch path). No new e2e test is planned
  for the cover-fetch path itself — unit coverage plus manual verification
  is proportionate; e2e would need to mock both a real image URL and the new
  `/cover` endpoint for little additional confidence.

## Open technical risk

Hashing binary image bytes requires bridging PocketBase's byte-array
(`Array<number>`) representation into `$security.sha256`, which only
documents a `string` parameter. `toString(bytes)` is presumed to be the
sanctioned bridge, but it hasn't been verified to be byte-safe for arbitrary
binary (non-UTF-8) data in this PocketBase version (0.40.1). **The first
implementation task should prove this** — hash a real image and compare
against a known-good SHA-256 — before the rest of the feature is built on
it. If it isn't byte-safe, fall back to shelling out via `$os.exec` to
compute the hash instead.
