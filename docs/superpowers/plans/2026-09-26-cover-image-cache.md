# Cover Image Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store book cover images once in a shared, deduplicated collection (keyed by source URL and content hash) instead of each book keeping its own private copy, cutting storage growth as more users add the same books.

**Architecture:** A new `cover_images` PocketBase collection holds the actual file bytes plus `source_url`/`hash`/`ref_count`. `books` gains a `cover_image` relation (replacing `cover_file`) and keeps `cover_url` as a denormalized display/prefill field. PocketBase hooks resolve a book's `cover_url` into a shared `cover_images` row server-side (downloading it, with SSRF/size/format guardrails), reusing an existing row by URL or content hash wherever possible; a new `/api/books/:id/cover` endpoint accepts a client-side-fetched fallback file (for URLs the server can't reach) and hash-dedupes it the same way. Ref-counting is centralized in one diff routine keyed on the before/after `cover_image` value, regardless of which code path changed it.

**Tech Stack:** PocketBase 0.40.1 (JSVM hooks), Vue 3 + Pinia + TanStack Query (frontend), vitest (both `frontend/` and the `backend/` harness created for `bookSearch.js`).

**Spec:** `docs/superpowers/specs/2026-09-26-cover-image-cache-design.md`

## Global Constraints

- Max image size: 512KB (`MAX_IMAGE_SIZE_BYTES = 512 * 1024`), enforced both at the PocketBase schema level (`file` field `maxSize`) and in application code.
- Allowed image formats: JPEG, PNG, GIF, WebP, BMP only (no SVG, no ICO) — determined by magic-byte sniffing of the actual bytes, not a declared `Content-Type`.
- Server-side download timeout: 10 seconds (matches the existing `/api/books/search` endpoint from the prior feature).
- `cover_images` collection: `createRule`/`updateRule`/`deleteRule` unset (superuser/hook-only — never writable via the public REST API). `listRule`/`viewRule`: `""` (public read).
- `books.cover_image`: relation to `cover_images`, single, optional, `cascadeDelete: false` — ref-count/cleanup is hook-driven, never a DB cascade.
- No backfill migration — the database can be recreated; migrations change the schema directly.
- A cover-fetch failure must never block saving a book. `cover_url` alone is always a valid, saveable state.

## Review Focus

- Two users add the same brand-new (never-before-seen) cover URL at nearly the same time → both hook invocations miss the by-hash lookup, both try to create a `cover_images` row, and the unique index on `hash` rejects the second `$app.save` — this must be caught and turned into "reuse the row the other request just created," not a failed book save.
- A book's `cover_url` is cleared (set to `""`) on update → the old `cover_image` must be decremented (and deleted if it hits zero), and the book's `cover_image` must become empty — "no cover" is a valid, reachable state, not just "cover never set."
- `POST /api/books/:id/cover` for a book the requester doesn't own must 403, never silently succeed or leak another user's book by id.
- Deleting a book that never had a cover (`cover_image` empty) must no-op the ref-count decrement cleanly, not throw on a missing id.
- A guardrail rejection (private/loopback URL, oversized response, unrecognized format) during the create/update hook's server-side download must degrade to "no `cover_image` set," not throw and fail the whole book save.

---

## Task 1: Migration — create the `cover_images` collection

**Files:**
- Create: `backend/pb_migrations/1790400001_created_cover_images.js`

**Interfaces:**
- Produces: a PocketBase collection named `cover_images`, id `pbc_coverimages001`, with fields `file`, `source_url`, `hash`, `ref_count` — consumed by every later backend task via `$app.findCollectionByNameOrId("cover_images")`.

This can't be unit tested (no test harness exists for applying PocketBase migrations — same as every existing migration in this repo). Verification is manual, folded into this task's steps.

- [ ] **Step 1: Write the migration**

```js
/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "id": "pbc_coverimages001",
    "name": "cover_images",
    "type": "base",
    "system": false,
    "listRule": "",
    "viewRule": "",
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text_ci_id_001",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "autodate_ci_created_001",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate_ci_updated_001",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "file_ci_file_001",
        "maxSelect": 1,
        "maxSize": 524288,
        "mimeTypes": [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
          "image/bmp"
        ],
        "name": "file",
        "presentable": false,
        "protected": false,
        "required": true,
        "system": false,
        "thumbs": ["200x300"],
        "type": "file"
      },
      {
        "exceptDomains": [],
        "hidden": false,
        "id": "url_ci_sourceurl_001",
        "name": "source_url",
        "onlyDomains": [],
        "presentable": false,
        "required": false,
        "system": false,
        "type": "url"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_ci_hash_001",
        "max": 64,
        "min": 64,
        "name": "hash",
        "pattern": "^[a-f0-9]{64}$",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "number_ci_refcount_001",
        "max": null,
        "min": 0,
        "name": "ref_count",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      }
    ],
    "indexes": [
      "CREATE UNIQUE INDEX `idx_cover_images_hash` ON `cover_images` (`hash`)",
      "CREATE INDEX `idx_cover_images_source_url` ON `cover_images` (`source_url`)"
    ]
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_coverimages001")

  return app.delete(collection)
})
```

- [ ] **Step 2: Verify the migration applies cleanly**

Run a fresh PocketBase container against this repo's `backend/` (mirrors the manual verification done for the prior `/api/books/search` feature):

```bash
cd infrastructure && docker compose -f compose-dev.yaml build backend
docker run -d --name coverimg-migration-check -p 18091:8090 \
  -v "$(pwd)/../backend/pb_hooks:/pb/pb_hooks" \
  -v "$(pwd)/../backend/pb_migrations:/pb/pb_migrations" \
  infrastructure-backend:latest
sleep 2
docker logs coverimg-migration-check 2>&1 | tail -20
```

Expected: server starts with no migration errors logged (no "failed to apply migration" or panic text).

- [ ] **Step 3: Tear down**

```bash
docker stop coverimg-migration-check && docker rm coverimg-migration-check
```

- [ ] **Step 4: Commit**

```bash
git add backend/pb_migrations/1790400001_created_cover_images.js
git commit -m "Add cover_images collection for deduplicated cover storage"
```

---

## Task 2: Migration — update `books` schema (drop `cover_file`, add `cover_image`)

**Files:**
- Create: `backend/pb_migrations/1790400002_updated_books_cover_image.js`

**Interfaces:**
- Consumes: `pbc_coverimages001` (Task 1) as the `collectionId` for the new relation field.
- Produces: `books.cover_image` (relation, single, optional, `cascadeDelete: false`), consumed by every later backend and frontend task. `books.cover_file` no longer exists.

- [ ] **Step 1: Write the migration**

```js
/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2170393721")

  collection.fields.removeById("file3091431417")

  collection.fields.addAt(9, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_coverimages001",
    "hidden": false,
    "id": "relation_books_coverimage_001",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "cover_image",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2170393721")

  collection.fields.removeById("relation_books_coverimage_001")

  collection.fields.addAt(9, new Field({
    "hidden": false,
    "id": "file3091431417",
    "maxSelect": 1,
    "maxSize": 0,
    "mimeTypes": [],
    "name": "cover_file",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": ["200x300"],
    "type": "file"
  }))

  return app.save(collection)
})
```

- [ ] **Step 2: Verify against the running container**

```bash
docker run -d --name coverimg-migration-check2 -p 18091:8090 \
  -v "$(pwd)/../backend/pb_hooks:/pb/pb_hooks" \
  -v "$(pwd)/../backend/pb_migrations:/pb/pb_migrations" \
  infrastructure-backend:latest
sleep 2
docker logs coverimg-migration-check2 2>&1 | tail -20
curl -s http://localhost:18091/api/collections/books | head -c 2000
docker stop coverimg-migration-check2 && docker rm coverimg-migration-check2
```

Expected: no migration errors; the `books` collection's schema (in the JSON returned — this endpoint may require auth in some PocketBase versions, in which case just check the logs for errors instead) reflects `cover_image` instead of `cover_file`.

- [ ] **Step 3: Commit**

```bash
git add backend/pb_migrations/1790400002_updated_books_cover_image.js
git commit -m "Replace books.cover_file with a cover_image relation"
```

---

## Task 3: Pure logic — URL guardrails

**Files:**
- Create: `backend/pb_hooks/coverImages.js`
- Test: `backend/pb_hooks/__tests__/coverImages.spec.js`

**Interfaces:**
- Produces: `checkUrlAllowed(urlString)` → `{ allowed: boolean, reason?: string }`. Consumed by Task 7's `resolveCoverImageForUrl`.

No `URL` global exists in PocketBase's JSVM, so this parses URLs with a plain regex — the same code must run correctly under both Node (this test) and goja (production).

- [ ] **Step 1: Write the failing tests**

```js
import { describe, it, expect } from 'vitest'
import { checkUrlAllowed } from '../coverImages.js'

describe('checkUrlAllowed', () => {
  it('allows a normal https URL', () => {
    expect(checkUrlAllowed('https://covers.openlibrary.org/b/id/1-M.jpg')).toEqual({ allowed: true })
  })

  it('allows a normal http URL', () => {
    expect(checkUrlAllowed('http://example.com/cover.jpg')).toEqual({ allowed: true })
  })

  it('rejects a non-http(s) scheme', () => {
    expect(checkUrlAllowed('ftp://example.com/cover.jpg')).toEqual({
      allowed: false,
      reason: 'unsupported scheme'
    })
  })

  it('rejects an unparseable URL', () => {
    expect(checkUrlAllowed('not a url')).toEqual({ allowed: false, reason: 'unparseable url' })
  })

  it('rejects loopback IPv4', () => {
    expect(checkUrlAllowed('http://127.0.0.1/x.jpg')).toEqual({ allowed: false, reason: 'disallowed host' })
  })

  it('rejects 10.0.0.0/8 private IPv4', () => {
    expect(checkUrlAllowed('http://10.1.2.3/x.jpg').allowed).toBe(false)
  })

  it('rejects 172.16.0.0/12 private IPv4', () => {
    expect(checkUrlAllowed('http://172.16.5.5/x.jpg').allowed).toBe(false)
    expect(checkUrlAllowed('http://172.31.0.1/x.jpg').allowed).toBe(false)
    expect(checkUrlAllowed('http://172.32.0.1/x.jpg').allowed).toBe(true)
  })

  it('rejects 192.168.0.0/16 private IPv4', () => {
    expect(checkUrlAllowed('http://192.168.1.1/x.jpg').allowed).toBe(false)
  })

  it('rejects link-local 169.254.0.0/16', () => {
    expect(checkUrlAllowed('http://169.254.169.254/latest/meta-data').allowed).toBe(false)
  })

  it('rejects localhost and .local/.internal hostnames', () => {
    expect(checkUrlAllowed('http://localhost/x.jpg').allowed).toBe(false)
    expect(checkUrlAllowed('http://LOCALHOST/x.jpg').allowed).toBe(false)
    expect(checkUrlAllowed('http://myhost.local/x.jpg').allowed).toBe(false)
    expect(checkUrlAllowed('http://api.internal/x.jpg').allowed).toBe(false)
  })

  it('rejects IPv6 loopback and link-local', () => {
    expect(checkUrlAllowed('http://[::1]/x.jpg').allowed).toBe(false)
    expect(checkUrlAllowed('http://[fe80::1]/x.jpg').allowed).toBe(false)
    expect(checkUrlAllowed('http://[fc00::1]/x.jpg').allowed).toBe(false)
  })

  it('allows a normal public hostname that merely contains digits', () => {
    expect(checkUrlAllowed('https://img101.example.com/x.jpg').allowed).toBe(true)
  })
})
```

- [ ] **Step 2: Run and verify it fails for the right reason**

Run: `cd backend && npm test -- coverImages` (from `backend/`)
Expected: FAIL — `Cannot find module '../coverImages.js'` (or similarly, `checkUrlAllowed is not a function`).

- [ ] **Step 3: Implement**

```js
// backend/pb_hooks/coverImages.js
//
// Pure logic for cover-image caching, kept free of PocketBase's
// $app/$http/$security/routerAdd globals so it can run under a normal JS
// test runner. coverImagesResolve.js (PocketBase-dependent) and
// coverImages.pb.js (routerAdd/hook wiring) require this file.

const PRIVATE_IPV4_RANGES = [
  { start: [10, 0, 0, 0], end: [10, 255, 255, 255] },
  { start: [172, 16, 0, 0], end: [172, 31, 255, 255] },
  { start: [192, 168, 0, 0], end: [192, 168, 255, 255] },
  { start: [127, 0, 0, 0], end: [127, 255, 255, 255] },
  { start: [169, 254, 0, 0], end: [169, 254, 255, 255] },
  { start: [0, 0, 0, 0], end: [0, 255, 255, 255] }
]

function parseUrl(urlString) {
  const match = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/(\[[^\]]+\]|[^/:?#]+)(?::\d+)?/.exec(urlString)
  if (!match) return null

  const scheme = match[1].toLowerCase()
  let hostname = match[2]
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    hostname = hostname.slice(1, -1)
  }

  return { scheme, hostname: hostname.toLowerCase() }
}

function isIPv4(hostname) {
  return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)
}

function isPrivateIPv4(hostname) {
  if (!isIPv4(hostname)) return false

  const octets = hostname.split('.').map(Number)
  if (octets.some((o) => o > 255)) return false

  return PRIVATE_IPV4_RANGES.some(({ start, end }) =>
    octets.every((o, i) => o >= start[i] && o <= end[i])
  )
}

function isDisallowedIPv6(hostname) {
  if (!hostname.includes(':')) return false

  const normalized = hostname.toLowerCase()
  return (
    normalized === '::1' ||
    normalized.startsWith('fe8') || normalized.startsWith('fe9') ||
    normalized.startsWith('fea') || normalized.startsWith('feb') ||
    normalized.startsWith('fc') || normalized.startsWith('fd')
  )
}

function isDisallowedHostname(hostname) {
  return hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')
}

function checkUrlAllowed(urlString) {
  const parsed = parseUrl(urlString)
  if (!parsed) {
    return { allowed: false, reason: 'unparseable url' }
  }

  if (parsed.scheme !== 'http' && parsed.scheme !== 'https') {
    return { allowed: false, reason: 'unsupported scheme' }
  }

  if (
    isPrivateIPv4(parsed.hostname) ||
    isDisallowedIPv6(parsed.hostname) ||
    isDisallowedHostname(parsed.hostname)
  ) {
    return { allowed: false, reason: 'disallowed host' }
  }

  return { allowed: true }
}

module.exports = { checkUrlAllowed }
```

- [ ] **Step 4: Run and verify it passes**

Run: `cd backend && npm test -- coverImages`
Expected: all `checkUrlAllowed` tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/pb_hooks/coverImages.js backend/pb_hooks/__tests__/coverImages.spec.js
git commit -m "Add URL guardrail checks for server-side cover downloads"
```

---

## Task 4: Pure logic — image byte validation

**Files:**
- Modify: `backend/pb_hooks/coverImages.js`
- Modify: `backend/pb_hooks/__tests__/coverImages.spec.js`

**Interfaces:**
- Produces: `validateImageBytes(bytes)` → `{ valid: true, mimeType } | { valid: false, code, error }`, where `code` is `'cover_too_large'` or `'cover_invalid_format'`. Consumed by Task 7.
- Produces: `MAX_IMAGE_SIZE_BYTES` (exported constant, `524288`).

Determines format by sniffing magic bytes directly (not a declared `Content-Type`) — more robust against a wrong/missing header from either the download or a client upload, and it's the same technique already used client-side in `frontend/src/utils/imageFetcher.js` (ported here so it can't be bypassed by a modified client).

- [ ] **Step 1: Write the failing tests**

```js
// append to backend/pb_hooks/__tests__/coverImages.spec.js
import { validateImageBytes, MAX_IMAGE_SIZE_BYTES } from '../coverImages.js'

const PNG_HEADER = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]
const JPEG_HEADER = [0xFF, 0xD8, 0xFF]

function bytesOf(header, totalLength = header.length) {
  const bytes = new Array(totalLength).fill(0)
  header.forEach((b, i) => { bytes[i] = b })
  return bytes
}

describe('validateImageBytes', () => {
  it('accepts a valid PNG', () => {
    const result = validateImageBytes(bytesOf(PNG_HEADER, 100))
    expect(result).toEqual({ valid: true, mimeType: 'image/png' })
  })

  it('accepts a valid JPEG', () => {
    const result = validateImageBytes(bytesOf(JPEG_HEADER, 100))
    expect(result).toEqual({ valid: true, mimeType: 'image/jpeg' })
  })

  it('rejects bytes over the size cap', () => {
    const result = validateImageBytes(bytesOf(PNG_HEADER, MAX_IMAGE_SIZE_BYTES + 1))
    expect(result).toEqual({
      valid: false,
      code: 'cover_too_large',
      error: 'Image is too large (max 512KB).'
    })
  })

  it('rejects bytes matching no known image signature', () => {
    const result = validateImageBytes(bytesOf([0x00, 0x01, 0x02, 0x03], 20))
    expect(result).toEqual({
      valid: false,
      code: 'cover_invalid_format',
      error: "That doesn't look like a supported image (JPEG, PNG, GIF, WebP, BMP)."
    })
  })

  it('rejects an empty byte array', () => {
    expect(validateImageBytes([]).valid).toBe(false)
  })
})
```

- [ ] **Step 2: Run and verify it fails**

Run: `cd backend && npm test -- coverImages`
Expected: FAIL — `validateImageBytes is not a function`.

- [ ] **Step 3: Implement**

```js
// add to backend/pb_hooks/coverImages.js, above module.exports

const MAX_IMAGE_SIZE_BYTES = 512 * 1024

const IMAGE_MAGIC_BYTES = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]
  ],
  'image/webp': [[0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50]],
  'image/bmp': [[0x42, 0x4D]]
}

function matchesMagicBytes(bytes, signature) {
  if (bytes.length < signature.length) return false

  for (let i = 0; i < signature.length; i++) {
    if (signature[i] !== null && bytes[i] !== signature[i]) return false
  }

  return true
}

function sniffImageMimeType(bytes) {
  for (const [mimeType, signatures] of Object.entries(IMAGE_MAGIC_BYTES)) {
    if (signatures.some((sig) => matchesMagicBytes(bytes, sig))) return mimeType
  }
  return null
}

function validateImageBytes(bytes) {
  if (!bytes || bytes.length === 0 || bytes.length > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      code: 'cover_too_large',
      error: `Image is too large (max ${MAX_IMAGE_SIZE_BYTES / 1024}KB).`
    }
  }

  const mimeType = sniffImageMimeType(bytes)
  if (!mimeType) {
    return {
      valid: false,
      code: 'cover_invalid_format',
      error: "That doesn't look like a supported image (JPEG, PNG, GIF, WebP, BMP)."
    }
  }

  return { valid: true, mimeType }
}
```

Update the `module.exports` line:

```js
module.exports = { checkUrlAllowed, validateImageBytes, MAX_IMAGE_SIZE_BYTES }
```

Note: an empty array now returns the `cover_too_large` code, which is a slightly misleading label for a 0-byte input — that's fine here since it can only happen on an internal bug (an empty download/upload), not a real user-facing size complaint; not worth a third error code.

- [ ] **Step 4: Run and verify it passes**

Run: `cd backend && npm test -- coverImages`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add backend/pb_hooks/coverImages.js backend/pb_hooks/__tests__/coverImages.spec.js
git commit -m "Add magic-byte image validation shared by url-fetch and upload paths"
```

---

## Task 5: Pure logic — ref-count diffing and dedup decision

**Files:**
- Modify: `backend/pb_hooks/coverImages.js`
- Modify: `backend/pb_hooks/__tests__/coverImages.spec.js`

**Interfaces:**
- Produces: `diffCoverImageChange(oldId, newId)` → `{ toDecrement: string|null, toIncrement: string|null }`. Consumed by Task 7's `applyCoverImageChange`.
- Produces: `decideCoverImageResolution({ existingByUrl, existingByHash })` → `{ action: 'reuse', id: string } | { action: 'create' }`, where `existingByUrl`/`existingByHash` are `{ id: string } | null`. Consumed by Task 7's `resolveCoverImageForUrl`/`resolveCoverImageForBytes`.

This directly covers two Review Focus items: a book delete when there was never a cover (null-safety), and clearing a cover_url (old-present/new-null diff).

- [ ] **Step 1: Write the failing tests**

```js
// append to backend/pb_hooks/__tests__/coverImages.spec.js
import { diffCoverImageChange, decideCoverImageResolution } from '../coverImages.js'

describe('diffCoverImageChange', () => {
  it('does nothing when the cover_image is unchanged', () => {
    expect(diffCoverImageChange('img1', 'img1')).toEqual({ toDecrement: null, toIncrement: null })
  })

  it('does nothing when both old and new are empty (never had a cover)', () => {
    expect(diffCoverImageChange('', '')).toEqual({ toDecrement: null, toIncrement: null })
    expect(diffCoverImageChange(null, null)).toEqual({ toDecrement: null, toIncrement: null })
  })

  it('increments only when a cover is newly set', () => {
    expect(diffCoverImageChange('', 'img1')).toEqual({ toDecrement: null, toIncrement: 'img1' })
  })

  it('decrements only when a cover is cleared', () => {
    expect(diffCoverImageChange('img1', '')).toEqual({ toDecrement: 'img1', toIncrement: null })
  })

  it('decrements the old and increments the new when the cover changes', () => {
    expect(diffCoverImageChange('img1', 'img2')).toEqual({ toDecrement: 'img1', toIncrement: 'img2' })
  })

  it('handles a book delete with no cover ever set (both null)', () => {
    // A book delete calls diffCoverImageChange(oldCoverImageId, null/"") —
    // must not throw or attempt to decrement a non-existent id.
    expect(diffCoverImageChange('', null)).toEqual({ toDecrement: null, toIncrement: null })
  })
})

describe('decideCoverImageResolution', () => {
  it('reuses an existing row found by url', () => {
    expect(decideCoverImageResolution({ existingByUrl: { id: 'img1' }, existingByHash: null }))
      .toEqual({ action: 'reuse', id: 'img1' })
  })

  it('reuses an existing row found by hash when url missed', () => {
    expect(decideCoverImageResolution({ existingByUrl: null, existingByHash: { id: 'img2' } }))
      .toEqual({ action: 'reuse', id: 'img2' })
  })

  it('prefers the url match when both are present', () => {
    expect(decideCoverImageResolution({ existingByUrl: { id: 'img1' }, existingByHash: { id: 'img2' } }))
      .toEqual({ action: 'reuse', id: 'img1' })
  })

  it('signals create when neither matches', () => {
    expect(decideCoverImageResolution({ existingByUrl: null, existingByHash: null }))
      .toEqual({ action: 'create' })
  })
})
```

- [ ] **Step 2: Run and verify it fails**

Run: `cd backend && npm test -- coverImages`
Expected: FAIL — `diffCoverImageChange is not a function`.

- [ ] **Step 3: Implement**

```js
// add to backend/pb_hooks/coverImages.js, above module.exports

function diffCoverImageChange(oldId, newId) {
  const normalizedOld = oldId || null
  const normalizedNew = newId || null

  if (normalizedOld === normalizedNew) {
    return { toDecrement: null, toIncrement: null }
  }

  return { toDecrement: normalizedOld, toIncrement: normalizedNew }
}

function decideCoverImageResolution({ existingByUrl, existingByHash }) {
  if (existingByUrl) return { action: 'reuse', id: existingByUrl.id }
  if (existingByHash) return { action: 'reuse', id: existingByHash.id }
  return { action: 'create' }
}
```

Update `module.exports`:

```js
module.exports = {
  checkUrlAllowed,
  validateImageBytes,
  MAX_IMAGE_SIZE_BYTES,
  diffCoverImageChange,
  decideCoverImageResolution
}
```

- [ ] **Step 4: Run and verify it passes**

Run: `cd backend && npm test -- coverImages`
Expected: all pass (20 tests across the three describe blocks so far).

- [ ] **Step 5: Commit**

```bash
git add backend/pb_hooks/coverImages.js backend/pb_hooks/__tests__/coverImages.spec.js
git commit -m "Add ref-count diffing and dedup-decision logic"
```

---

## Task 6: Spike — verify the binary-hashing bridge inside real PocketBase

**Files:**
- Temporary: `backend/pb_hooks/_hashSpike.pb.js` (deleted at the end of this task — never committed)

**Interfaces:**
- Produces: a confirmed one-line recipe for `hashBytes(bytes)` (correct SHA-256 of arbitrary binary data), consumed by Task 7.

This can't be resolved by writing more code without running it — `$security.sha256` only documents a `string` parameter, and PocketBase's JSVM has no exposed way to unit-test this outside the real binary. This step proves it against a real image before anything is built on top of it.

- [ ] **Step 1: Get a known-good hash to compare against**

```bash
curl -s -o /tmp/test-cover.jpg "https://covers.openlibrary.org/b/id/8745958-M.jpg"
shasum -a 256 /tmp/test-cover.jpg
```

Note the printed hash (call it `EXPECTED_HASH`).

- [ ] **Step 2: Write a temporary debug route**

```js
// backend/pb_hooks/_hashSpike.pb.js — TEMPORARY, do not commit
routerAdd("GET", "/api/_hash-spike", (e) => {
  const res = $http.send({ url: "https://covers.openlibrary.org/b/id/8745958-M.jpg", method: "GET", timeout: 10 })
  const bridged = toString(res.body)
  const hash = $security.sha256(bridged)
  return e.json(200, { hash, bodyLength: res.body.length })
})
```

- [ ] **Step 3: Run it against a live container and compare**

```bash
cd infrastructure && docker compose -f compose-dev.yaml build backend
docker run -d --name hash-spike -p 18092:8090 \
  -v "$(pwd)/../backend/pb_hooks:/pb/pb_hooks" \
  -v "$(pwd)/../backend/pb_migrations:/pb/pb_migrations" \
  infrastructure-backend:latest
sleep 2
curl -s http://localhost:18092/api/_hash-spike
docker stop hash-spike && docker rm hash-spike
```

Compare the returned `hash` to `EXPECTED_HASH` from Step 1.

- [ ] **Step 4: If they match**, the bridge is confirmed correct. The recipe for Task 7 is:

```js
function hashBytes(bytes) {
  return $security.sha256(toString(bytes))
}
```

- [ ] **Step 4b: If they DON'T match**, use the `$os.exec` fallback instead — write the bytes to a temp file and shell out:

```js
function hashBytes(bytes) {
  const path = `/tmp/cover-hash-${Date.now()}-${Math.random().toString(36).slice(2)}.bin`
  $os.writeFile(path, toBytes(bytes), 0o600)
  try {
    const result = $os.cmd("sha256sum", path).output()
    return toString(result).trim().split(/\s+/)[0]
  } finally {
    $os.remove(path)
  }
}
```

(Check `backend/pb_data/types.d.ts` for the exact `$os.writeFile`/`$os.cmd`/`$os.remove` signatures at implementation time if this branch is needed — they exist under the `$os` namespace but weren't needed if Step 4 succeeded.)

- [ ] **Step 5: Delete the spike route**

```bash
rm backend/pb_hooks/_hashSpike.pb.js
```

- [ ] **Step 6: No commit for this task** — it produces a confirmed code recipe (written into Task 7 next), not a file change. If Step 4b's fallback was needed, note that in the commit message of Task 7 instead.

---

## Task 7: Wiring helpers — resolve, download, hash, apply ref-counts

**Files:**
- Create: `backend/pb_hooks/coverImagesResolve.js`

**Interfaces:**
- Consumes: `checkUrlAllowed`, `validateImageBytes`, `diffCoverImageChange`, `decideCoverImageResolution` (Task 3/4/5); the `hashBytes` recipe confirmed in Task 6.
- Produces: `resolveCoverImageForUrl($app, url)` → `string` (a `cover_images` record id, or `""` if unresolvable), `resolveCoverImageForBytes($app, bytes)` → `{ id: string } | { error: { status, code, message } }`, `applyCoverImageChange($app, oldId, newId)` → `void`. Consumed by Task 8 and Task 9.

This module uses PocketBase's `$app`/`$http`/`$security`/`toString`/`$filesystem` globals, so — like `coverImages.js` — it can't be unit tested without the real binary; it's required fresh inside each `coverImages.pb.js` handler (per this codebase's established rule that `routerAdd`/`onRecordX` handlers don't close over top-level bindings — see `remoteUserAuth.pb.js`'s comment on this). Verified manually in Task 10.

- [ ] **Step 1: Write the module**

```js
// backend/pb_hooks/coverImagesResolve.js
//
// PocketBase-dependent helpers for resolving a book's cover into the shared
// cover_images collection. Not unit-tested directly (needs $app/$http) —
// the decision logic it calls into (coverImages.js) is. Required fresh
// inside each coverImages.pb.js handler, never cached at module top level.

const {
  checkUrlAllowed,
  validateImageBytes,
  diffCoverImageChange,
  decideCoverImageResolution
} = require(`${__hooks}/coverImages.js`)

const DOWNLOAD_TIMEOUT_SECONDS = 10

function hashBytes(bytes) {
  return $security.sha256(toString(bytes))
}

function findByFilter(app, filter, params) {
  try {
    return app.findFirstRecordByFilter("cover_images", filter, params)
  } catch {
    return null
  }
}

function createCoverImageRecord(app, { bytes, mimeType, sourceUrl, hash }) {
  const collection = app.findCollectionByNameOrId("cover_images")
  const record = new Record(collection)
  const extension = mimeType.split('/')[1] || 'jpg'
  record.set("file", $filesystem.fileFromBytes(bytes, `cover.${extension}`))
  record.set("source_url", sourceUrl || "")
  record.set("hash", hash)
  record.set("ref_count", 0)

  try {
    app.save(record)
    return record
  } catch (err) {
    // Lost a create race to a concurrent request resolving the same bytes
    // (unique index on hash) — the other request's row now exists, reuse it.
    const existing = findByFilter(app, "hash = {:hash}", { hash })
    if (existing) return existing
    throw err
  }
}

function downloadAndValidate(url) {
  const urlCheck = checkUrlAllowed(url)
  if (!urlCheck.allowed) {
    return { failed: true }
  }

  let res
  try {
    res = $http.send({ url, method: "GET", timeout: DOWNLOAD_TIMEOUT_SECONDS })
  } catch {
    return { failed: true }
  }

  if (res.statusCode < 200 || res.statusCode >= 300) {
    return { failed: true }
  }

  const validation = validateImageBytes(res.body)
  if (!validation.valid) {
    return { failed: true }
  }

  return { failed: false, bytes: res.body, mimeType: validation.mimeType }
}

/** Resolves a book's cover_url into a cover_images record id, or "" if it can't be (never throws). */
function resolveCoverImageForUrl(app, url) {
  const existingByUrl = findByFilter(app, "source_url = {:url}", { url })
  if (existingByUrl) return existingByUrl.id

  const downloaded = downloadAndValidate(url)
  if (downloaded.failed) return ""

  const hash = hashBytes(downloaded.bytes)
  const existingByHash = findByFilter(app, "hash = {:hash}", { hash })

  const decision = decideCoverImageResolution({ existingByUrl: null, existingByHash })
  if (decision.action === 'reuse') return decision.id

  const record = createCoverImageRecord(app, {
    bytes: downloaded.bytes,
    mimeType: downloaded.mimeType,
    sourceUrl: url,
    hash
  })
  return record.id
}

/** Resolves raw uploaded bytes (the client-side-fetch fallback) into a cover_images record id. */
function resolveCoverImageForBytes(app, bytes) {
  const validation = validateImageBytes(bytes)
  if (!validation.valid) {
    return { error: { status: 422, code: validation.code, message: validation.error } }
  }

  const hash = hashBytes(bytes)
  const existingByHash = findByFilter(app, "hash = {:hash}", { hash })

  const decision = decideCoverImageResolution({ existingByUrl: null, existingByHash })
  if (decision.action === 'reuse') return { id: decision.id }

  const record = createCoverImageRecord(app, {
    bytes,
    mimeType: validation.mimeType,
    sourceUrl: "",
    hash
  })
  return { id: record.id }
}

function adjustRefCount(app, id, delta) {
  if (!id) return

  let record
  try {
    record = app.findRecordById("cover_images", id)
  } catch {
    return
  }

  const newCount = (record.get("ref_count") || 0) + delta
  if (newCount <= 0) {
    app.delete(record)
    return
  }

  record.set("ref_count", newCount)
  app.save(record)
}

/** Applies the ref-count delta for a book's cover_image changing from oldId to newId. Never throws. */
function applyCoverImageChange(app, oldId, newId) {
  const diff = diffCoverImageChange(oldId, newId)
  try {
    if (diff.toDecrement) adjustRefCount(app, diff.toDecrement, -1)
    if (diff.toIncrement) adjustRefCount(app, diff.toIncrement, 1)
  } catch {
    // Ref-count bookkeeping must never fail the book save it's attached to.
  }
}

module.exports = { resolveCoverImageForUrl, resolveCoverImageForBytes, applyCoverImageChange }
```

Note: if Task 6 needed the `$os.exec` fallback for `hashBytes`, replace the `hashBytes` implementation above with that version instead.

- [ ] **Step 2: No automated test for this file** (documented reason above). Proceed to Task 8/9, which wire this module in, and Task 10, which verifies the whole chain manually.

- [ ] **Step 3: Commit**

```bash
git add backend/pb_hooks/coverImagesResolve.js
git commit -m "Add cover-image resolve/download/ref-count wiring helpers"
```

---

## Task 8: Hook wiring — resolve on book create/update, decrement on delete

**Files:**
- Create: `backend/pb_hooks/coverImages.pb.js`

**Interfaces:**
- Consumes: `resolveCoverImageForUrl`, `applyCoverImageChange` (Task 7).
- Produces: the actual `onRecordCreate`/`onRecordUpdate`/`onRecordAfterDeleteSuccess` registrations for `books` — this is the piece that makes the whole feature live.

- [ ] **Step 1: Write the wiring**

```js
/// <reference path="../pb_data/types.d.ts" />

// Resolves a book's cover_url into the shared cover_images collection
// (server-side download, deduped by url then by content hash) and keeps
// ref counts in sync. See coverImagesResolve.js for the resolve/download
// logic and coverImages.js for the pure decision logic both build on.
//
// Note: onRecordCreate/onRecordUpdate/onRecordAfterDeleteSuccess handlers
// are compiled standalone by the JSVM and do not close over top-level
// variables, so coverImagesResolve.js is required fresh inside each handler.

onRecordCreate((e) => {
  const { resolveCoverImageForUrl, applyCoverImageChange } = require(`${__hooks}/coverImagesResolve.js`)

  const url = e.record.get("cover_url")
  const newCoverImageId = url ? resolveCoverImageForUrl($app, url) : ""

  e.record.set("cover_image", newCoverImageId)
  e.next()

  applyCoverImageChange($app, "", newCoverImageId)
}, "books")

onRecordUpdate((e) => {
  const { resolveCoverImageForUrl, applyCoverImageChange } = require(`${__hooks}/coverImagesResolve.js`)

  const original = e.record.original()
  const oldCoverUrl = original.get("cover_url")
  const oldCoverImageId = original.get("cover_image")
  const newCoverUrl = e.record.get("cover_url")

  let newCoverImageId
  if (newCoverUrl !== oldCoverUrl) {
    newCoverImageId = newCoverUrl ? resolveCoverImageForUrl($app, newCoverUrl) : ""
    e.record.set("cover_image", newCoverImageId)
  } else {
    // cover_url didn't change on this update — cover_image may still have
    // changed directly (e.g. the /cover upload endpoint just set it).
    newCoverImageId = e.record.get("cover_image")
  }

  e.next()

  applyCoverImageChange($app, oldCoverImageId, newCoverImageId)
}, "books")

onRecordAfterDeleteSuccess((e) => {
  const { applyCoverImageChange } = require(`${__hooks}/coverImagesResolve.js`)

  const oldCoverImageId = e.record.get("cover_image")
  applyCoverImageChange($app, oldCoverImageId, "")

  e.next()
}, "books")
```

Note: `e.next()` is called before `applyCoverImageChange` in the create/update hooks so the ref-count adjustment runs only after the book record itself has actually been persisted with the new `cover_image` value — if the save fails downstream, the ref-count is never touched.

- [ ] **Step 2: No unit test for this file** (routerAdd/hook wiring, same as every other file in `pb_hooks`). Verified manually in Task 10 together with Task 9.

- [ ] **Step 3: Commit**

```bash
git add backend/pb_hooks/coverImages.pb.js
git commit -m "Wire cover-image resolution into books create/update/delete hooks"
```

---

## Task 9: `/api/books/:id/cover` upload endpoint (client-side-fetch fallback target)

**Files:**
- Modify: `backend/pb_hooks/coverImages.pb.js`

**Interfaces:**
- Consumes: `resolveCoverImageForBytes` (Task 7).
- Produces: `POST /api/books/:id/cover` — multipart field `file`, requires auth + ownership. Consumed by the frontend's `booksApi.uploadBookCover` (Task 12) for both the Edit Cover modal and the create/update fallback flow.

Covers two Review Focus items directly: rejecting a non-owner's upload, and surfacing a human-readable error for an invalid/oversized upload without needing to touch ref-counting here at all (that happens automatically via Task 8's `onRecordUpdate` hook when this handler calls `$app.save(book)`).

- [ ] **Step 1: Add the route**

```js
// append to backend/pb_hooks/coverImages.pb.js

routerAdd("POST", "/api/books/:id/cover", (e) => {
  const { resolveCoverImageForBytes } = require(`${__hooks}/coverImagesResolve.js`)

  if (!e.auth) {
    throw new UnauthorizedError("Authentication required")
  }

  let book
  try {
    book = $app.findRecordById("books", e.request.pathValue("id"))
  } catch {
    throw new NotFoundError("Book not found")
  }

  if (book.get("owner") !== e.auth.id) {
    throw new ForbiddenError("You don't own this book")
  }

  const uploaded = e.findUploadedFiles("file")
  if (!uploaded || uploaded.length === 0 || !uploaded[0]) {
    throw new BadRequestError("Expected a 'file' upload")
  }

  const bytes = toBytes(uploaded[0].reader.open())
  const resolved = resolveCoverImageForBytes($app, bytes)

  if (resolved.error) {
    throw new ApiError(resolved.error.status, resolved.error.message, { code: resolved.error.code })
  }

  book.set("cover_image", resolved.id)
  $app.save(book)

  return e.json(200, book)
})
```

Note: `toBytes(uploaded[0].reader.open())` reads the uploaded file's raw bytes via the same `toBytes` bridge documented for `e.request.body` — if this doesn't read the reader correctly at verification time (Task 10), the alternative is `toBytes(e.request.formFile("file")[0])` (the raw `multipart.File` from `e.request.formFile`, per `backend/pb_data/types.d.ts:17615`); try the documented `reader.open()` form first since `findUploadedFiles` is the more purpose-built helper for this.

- [ ] **Step 2: No unit test for this route** (same reason as Task 8). Verified manually in Task 10.

- [ ] **Step 3: Commit**

```bash
git add backend/pb_hooks/coverImages.pb.js
git commit -m "Add POST /api/books/:id/cover upload endpoint for the fetch fallback"
```

---

## Task 10: Manual end-to-end verification of the backend flow

**Files:** none (verification only)

**Interfaces:** none produced — this task's job is to catch anything Tasks 6–9's necessarily-unverified wiring got wrong before frontend work builds on it.

- [ ] **Step 1: Start a fresh container**

```bash
cd infrastructure && docker compose -f compose-dev.yaml build backend
docker run -d --name coverimg-e2e -p 18093:8090 \
  -v "$(pwd)/../backend/pb_hooks:/pb/pb_hooks" \
  -v "$(pwd)/../backend/pb_migrations:/pb/pb_migrations" \
  infrastructure-backend:latest
sleep 2
docker logs coverimg-e2e 2>&1 | tail -20
```

Expected: starts cleanly, no hook-load errors.

- [ ] **Step 2: Create a superuser and an auth token for manual requests**

```bash
docker exec coverimg-e2e /pb/pocketbase superuser upsert test@example.com testpass12345
```

Then use the PocketBase dashboard (`http://localhost:18093/_/`) or `curl -X POST http://localhost:18093/api/collections/users/records -d '{"email":"u@test.com","password":"testpass12345","passwordConfirm":"testpass12345"}'` plus `.../auth-with-password` to get a normal user auth token for the requests below. Record it as `TOKEN`.

- [ ] **Step 3: Verify url-hit dedup and the concurrent-create race (Review Focus)**

Create two books with the *same, brand-new* `cover_url` **concurrently** (backgrounded, not sequential) — this is the actual race Review Focus flags: both requests can miss the "does this url/hash already exist" lookup at the same moment and both attempt to create a `cover_images` row for the same hash, which the unique index should reject on the second `$app.save`, and `createCoverImageRecord`'s catch block should recover from by reusing the winner's row:

```bash
curl -s -X POST http://localhost:18093/api/collections/books/records \
  -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Book A","cover_url":"https://covers.openlibrary.org/b/id/8745958-M.jpg"}' > /tmp/race-a.json &
curl -s -X POST http://localhost:18093/api/collections/books/records \
  -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Book B","cover_url":"https://covers.openlibrary.org/b/id/8745958-M.jpg"}' > /tmp/race-b.json &
wait
cat /tmp/race-a.json /tmp/race-b.json
```

Expected: both requests succeed (no 500s from a failed `$app.save`), both responses have a non-empty `cover_image`, and it's the **same id** on both. Fetch that `cover_images` record through the dashboard and confirm `ref_count` is `2`, not `1` (a `1` would mean one of the two increments was silently lost) and not a duplicated row with `ref_count: 1` each (which would mean the race wasn't actually caught).

- [ ] **Step 4: Verify hash-hit dedup with a different URL, same bytes**

Add a book with a cover_url that 302-redirects or is otherwise a different URL serving byte-identical content to the one above, if one is conveniently available; otherwise skip this specific cross-URL case and instead verify it structurally: confirm in the code review that `resolveCoverImageForUrl` checks `hash` after a URL-miss (Task 7, Step 1) — this is the harder-to-manually-stage case, and the pure `decideCoverImageResolution` unit tests (Task 5) already pin the decision logic itself.

- [ ] **Step 5: Verify ref_count reaching zero deletes the row**

Update "Book A" to clear its cover, then delete "Book B":

```bash
curl -s -X PATCH http://localhost:18093/api/collections/books/records/<BOOK_A_ID> \
  -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{"cover_url":""}'
curl -s -X DELETE http://localhost:18093/api/collections/books/records/<BOOK_B_ID> \
  -H "Authorization: $TOKEN"
```

Expected: after both, the shared `cover_images` record from Step 3 is gone (404 when fetched by id).

- [ ] **Step 6: Verify a guardrail-blocked URL degrades gracefully (Review Focus)**

```bash
curl -s -X POST http://localhost:18093/api/collections/books/records \
  -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Book C","cover_url":"http://169.254.169.254/latest/meta-data"}'
```

Expected: `201`, book created successfully, `cover_image` is empty, `cover_url` is stored as given. No error.

- [ ] **Step 7: Verify `/cover` endpoint rejects a non-owner (Review Focus)**

Create a second user, get their token (`TOKEN2`), and try to upload a cover to Book A (owned by the first user):

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:18093/api/books/<BOOK_A_ID>/cover" \
  -H "Authorization: $TOKEN2" -F "file=@/tmp/test-cover.jpg"
```

Expected: `403`.

- [ ] **Step 8: Verify `/cover` endpoint accepts a valid upload from the owner**

```bash
curl -s -X POST "http://localhost:18093/api/books/<BOOK_A_ID>/cover" \
  -H "Authorization: $TOKEN" -F "file=@/tmp/test-cover.jpg"
```

Expected: `200`, response book has a non-empty `cover_image`; fetching that `cover_images` record shows `ref_count: 1`.

- [ ] **Step 9: Verify `/cover` endpoint rejects an invalid file**

```bash
echo "not an image" > /tmp/not-an-image.txt
curl -s -w "\n%{http_code}\n" -X POST "http://localhost:18093/api/books/<BOOK_A_ID>/cover" \
  -H "Authorization: $TOKEN" -F "file=@/tmp/not-an-image.txt"
```

Expected: `422`, body includes `"code":"cover_invalid_format"`.

- [ ] **Step 10: Tear down**

```bash
docker stop coverimg-e2e && docker rm coverimg-e2e
```

- [ ] **Step 11: No commit** (verification only). If any step above surfaced a bug, fix it in the relevant earlier task's file, re-run this task's steps from Step 1, and commit the fix with a message referencing what broke (e.g. `git commit -m "Fix cover_image ref-count decrement on cleared cover_url"`).

---

## Task 11: Frontend — `booksApi.js` transform changes and `expand`

**Files:**
- Modify: `frontend/src/services/booksApi.js:17-57` (`transformBookFromPocketBase`), `frontend/src/services/booksApi.js:63-133` (`createFormData`/`transformBookToPocketBase`), `frontend/src/services/booksApi.js:143-220` (`getBooks`/`getBook`/`createBook`/`updateBook`)
- Test: `frontend/src/services/__tests__/booksApi.spec.js`

**Interfaces:**
- Produces: `transformBookFromPocketBase` output gains `hasCachedCover: boolean`; `coverDisplayLink` now prefers the expanded `cover_image` file over `cover_url`. `transformBookToPocketBase` no longer returns `FormData` (the `cover_file`/upload branch is gone — files go through `uploadBookCover`, added in Task 12). Consumed by Task 12 (`updateBook`'s two-step logic) and Task 13/14 (`hasCachedCover` gates the fallback).

- [ ] **Step 1: Read the current test file to match its existing structure**

Run: `cd frontend && cat src/services/__tests__/booksApi.spec.js | head -80` — match its existing mocking style for `pb` (it mocks `@/services/pocketbase`).

- [ ] **Step 2: Write the failing tests**

```js
// add to frontend/src/services/__tests__/booksApi.spec.js, inside the existing describe block(s)
// for transformBookFromPocketBase / getBooks / createBook, following the file's existing
// pb-mocking pattern (mock pb.collection('books').create/getList/etc. and pb.files.getURL).

it('prefers the expanded cover_image file over cover_url for display', async () => {
  pb.collection().getList.mockResolvedValue({
    items: [{
      id: 'b1',
      name: 'Book',
      cover_url: 'https://example.com/original.jpg',
      cover_image: 'img1',
      expand: { cover_image: { id: 'img1', file: 'cover.jpg' } },
      attributes: {},
      created: '2024-01-01',
      updated: '2024-01-01'
    }]
  })
  pb.files.getURL.mockReturnValue('https://pb.local/api/files/cover_images/img1/cover.jpg')

  const books = await booksApi.getBooks()

  expect(books[0].coverDisplayLink).toBe('https://pb.local/api/files/cover_images/img1/cover.jpg')
  expect(books[0].hasCachedCover).toBe(true)
})

it('falls back to cover_url when there is no cached cover_image', async () => {
  pb.collection().getList.mockResolvedValue({
    items: [{
      id: 'b1',
      name: 'Book',
      cover_url: 'https://example.com/original.jpg',
      cover_image: '',
      attributes: {},
      created: '2024-01-01',
      updated: '2024-01-01'
    }]
  })

  const books = await booksApi.getBooks()

  expect(books[0].coverDisplayLink).toBe('https://example.com/original.jpg')
  expect(books[0].hasCachedCover).toBe(false)
})

it('requests the cover_image expand on getBooks/getBook/createBook/updateBook', async () => {
  pb.collection().getList.mockResolvedValue({ items: [] })
  await booksApi.getBooks()
  expect(pb.collection().getList).toHaveBeenCalledWith(1, 500, expect.objectContaining({ expand: 'cover_image' }))

  pb.collection().getOne.mockResolvedValue({ id: 'b1', attributes: {}, created: '', updated: '' })
  await booksApi.getBook('b1')
  expect(pb.collection().getOne).toHaveBeenCalledWith('b1', expect.objectContaining({ expand: 'cover_image' }))

  pb.collection().create.mockResolvedValue({ id: 'b1', attributes: {}, created: '', updated: '' })
  await booksApi.createBook({ name: 'X' })
  expect(pb.collection().create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ expand: 'cover_image' }))
})

it('sends a plain object, never FormData, to pb.collection().create', async () => {
  pb.collection().create.mockResolvedValue({ id: 'b1', attributes: {}, created: '', updated: '' })

  await booksApi.createBook({ name: 'X', coverLink: 'https://example.com/x.jpg' })

  const [sentData] = pb.collection().create.mock.calls[0]
  expect(sentData).not.toBeInstanceOf(FormData)
  expect(sentData).toEqual(expect.objectContaining({ name: 'X', cover_url: 'https://example.com/x.jpg' }))
})
```

- [ ] **Step 3: Run and verify these fail**

Run: `cd frontend && npx vitest run src/services/__tests__/booksApi.spec.js`
Expected: FAIL — `hasCachedCover` undefined, `expand` not passed, `uploadBookCover` not a function.

- [ ] **Step 4: Implement — `transformBookFromPocketBase`**

```js
// frontend/src/services/booksApi.js — replace lines 32-39 (the coverDisplayLink block)
  // Determine cover display link: prefer the shared, deduped cover_image
  // file over the plain cover_url hotlink.
  let coverDisplayLink = null
  const expandedCoverImage = pbBook.expand?.cover_image
  if (expandedCoverImage) {
    coverDisplayLink = pb.files.getURL(expandedCoverImage, expandedCoverImage.file, { thumb: '200x300' })
  } else if (pbBook.cover_url) {
    coverDisplayLink = pbBook.cover_url
  }
```

And add `hasCachedCover` to the returned object (after `coverDisplayLink,` around line 46):

```js
    coverDisplayLink,
    hasCachedCover: Boolean(pbBook.cover_image),
```

- [ ] **Step 5: Implement — drop the FormData branch**

Replace `createFormData` (lines 59-88) and the end of `transformBookToPocketBase` (lines 129-132) — delete `createFormData` entirely, and change:

```js
  // Return FormData if file present, otherwise plain object
  return storeBook.coverFile
    ? createFormData(data, storeBook.coverFile)
    : data
```

to:

```js
  return data
```

- [ ] **Step 6: Implement — add `expand` to the PocketBase calls**

```js
// getBooks (around line 151)
      const result = await pb.collection('books').getList(1, 500, {
        sort: '-created',
        expand: 'cover_image'
      })

// getBook (around line 174)
      const record = await pb.collection('books').getOne(id, { expand: 'cover_image' })

// createBook (around line 193)
      const record = await pb.collection('books').create(pbData, { expand: 'cover_image' })

// updateBook (around line 215)
      const record = await pb.collection('books').update(id, pbData, { expand: 'cover_image' })
```

- [ ] **Step 7: Add a placeholder `uploadBookCover` so this task's tests can pass** (fully implemented in Task 12 — this task only needs its signature to exist)

```js
// add as a method on the BooksApi class, near updateBook
  async uploadBookCover(id, file) {
    const formData = new FormData()
    formData.append('file', file)
    const record = await pb.send(`/api/books/${id}/cover`, { method: 'POST', body: formData })
    return transformBookFromPocketBase(record)
  }
```

- [ ] **Step 8: Run and verify the tests pass**

Run: `cd frontend && npx vitest run src/services/__tests__/booksApi.spec.js`
Expected: all pass.

- [ ] **Step 9: Run the full frontend suite to check nothing else broke**

Run: `cd frontend && npx vitest run`
Expected: all pass (some existing tests may reference `coverFile`/FormData behavior removed here — fix any that do by updating their expectations to match the new plain-object `transformBookToPocketBase`).

- [ ] **Step 10: Commit**

```bash
git add frontend/src/services/booksApi.js frontend/src/services/__tests__/booksApi.spec.js
git commit -m "Read covers from the shared cover_image relation, drop cover_file upload path"
```

---

## Task 12: Frontend — `uploadBookCover` two-step `updateBook` and error surfacing

**Files:**
- Modify: `frontend/src/services/booksApi.js:206-220` (`updateBook`)
- Modify: `frontend/src/services/__tests__/booksApi.spec.js`

**Interfaces:**
- Consumes: `uploadBookCover` (Task 11, placeholder — this task is where its real behavior is pinned by tests), `adaptPocketBaseError` (existing).
- Produces: `updateBook(id, book)` — when `book.coverFile` is present, performs the plain update first, then uploads the file, merging the upload response's cover fields into the final returned book. Consumed by `BookCoverModal`'s existing save flow (no changes needed there — see spec's Frontend Integration section) via the unchanged `booksStore.updateBookFields` → `useUpdateBook` → `booksApi.updateBook` chain.

- [ ] **Step 1: Write the failing tests**

```js
// add to frontend/src/services/__tests__/booksApi.spec.js

describe('updateBook with a coverFile (Edit Cover modal upload)', () => {
  it('updates fields first, then uploads the file, and returns the merged result', async () => {
    pb.collection().update.mockResolvedValue({
      id: 'b1', name: 'Book', cover_url: 'https://example.com/x.jpg', cover_image: '',
      attributes: {}, created: '', updated: ''
    })
    pb.send.mockResolvedValue({
      id: 'b1', name: 'Book', cover_url: 'https://example.com/x.jpg', cover_image: 'img1',
      expand: { cover_image: { id: 'img1', file: 'cover.jpg' } },
      attributes: {}, created: '', updated: ''
    })
    pb.files.getURL.mockReturnValue('https://pb.local/cover.jpg')

    const fakeFile = new File(['x'], 'cover.jpg', { type: 'image/jpeg' })
    const result = await booksApi.updateBook('b1', { coverLink: 'https://example.com/x.jpg', coverFile: fakeFile })

    expect(pb.collection().update).toHaveBeenCalledWith(
      'b1',
      expect.not.objectContaining({ coverFile: expect.anything() }),
      expect.objectContaining({ expand: 'cover_image' })
    )
    expect(pb.send).toHaveBeenCalledWith('/api/books/b1/cover', expect.objectContaining({ method: 'POST' }))
    expect(result.hasCachedCover).toBe(true)
    expect(result.coverDisplayLink).toBe('https://pb.local/cover.jpg')
  })

  it('keeps the plain-update result (a live hotlink) if the cover upload fails', async () => {
    pb.collection().update.mockResolvedValue({
      id: 'b1', name: 'Book', cover_url: 'https://example.com/x.jpg', cover_image: '',
      attributes: {}, created: '', updated: ''
    })
    pb.send.mockRejectedValue(Object.assign(new Error('fail'), { name: 'ClientResponseError 422', status: 422 }))

    const fakeFile = new File(['x'], 'cover.jpg', { type: 'image/jpeg' })
    const result = await booksApi.updateBook('b1', { coverLink: 'https://example.com/x.jpg', coverFile: fakeFile })

    expect(result.coverDisplayLink).toBe('https://example.com/x.jpg')
    expect(result.hasCachedCover).toBe(false)
  })

  it('does not call uploadBookCover when there is no coverFile', async () => {
    pb.collection().update.mockResolvedValue({ id: 'b1', attributes: {}, created: '', updated: '' })

    await booksApi.updateBook('b1', { name: 'New name' })

    expect(pb.send).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run and verify these fail**

Run: `cd frontend && npx vitest run src/services/__tests__/booksApi.spec.js`
Expected: FAIL — the plain-update-only `updateBook` doesn't call `pb.send`, so `coverDisplayLink`/`hasCachedCover` come back from the first response only (no merge).

- [ ] **Step 3: Implement**

```js
// frontend/src/services/booksApi.js — replace updateBook (around lines 206-220)
  async updateBook(id, book) {
    if (isGuestMode()) {
      const updated = updateGuestBook(id, book)
      if (!updated) throw new Error(`Guest book not found: ${id}`)
      return updated
    }

    try {
      const { coverFile, ...bookWithoutFile } = book
      const pbData = transformBookToPocketBase(bookWithoutFile)
      const record = await pb.collection('books').update(id, pbData, { expand: 'cover_image' })
      let result = transformBookFromPocketBase(record)

      if (coverFile) {
        try {
          result = await this.uploadBookCover(id, coverFile)
        } catch (uploadError) {
          logger.warn('[BooksApi] Cover upload failed, keeping the live URL:', uploadError)
        }
      }

      return result
    } catch (error) {
      throw adaptPocketBaseError(error)
    }
  }
```

- [ ] **Step 4: Run and verify the tests pass**

Run: `cd frontend && npx vitest run src/services/__tests__/booksApi.spec.js`
Expected: all pass.

- [ ] **Step 5: Run the full frontend suite**

Run: `cd frontend && npx vitest run`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/services/booksApi.js frontend/src/services/__tests__/booksApi.spec.js
git commit -m "Split cover updates into a plain field update plus a separate upload call"
```

---

## Task 13: Frontend — `coverCache.js` fallback helper

**Files:**
- Create: `frontend/src/services/coverCache.js`
- Test: `frontend/src/services/__tests__/coverCache.spec.js`

**Interfaces:**
- Consumes: `fetchImageAsFile` (existing, `frontend/src/utils/imageFetcher.js`), `booksApi.uploadBookCover` (Task 12), `isGuestMode` (existing, `frontend/src/services/guestMode.js`).
- Produces: `ensureCoverCached(book)` → `Promise<Book|null>` — `null` when nothing needed to happen or the fallback failed; the patched book (from `uploadBookCover`) on success. Consumed by Task 14.

- [ ] **Step 1: Write the failing tests**

```js
// frontend/src/services/__tests__/coverCache.spec.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ensureCoverCached } from '../coverCache'
import { fetchImageAsFile } from '@/utils/imageFetcher'
import { booksApi } from '../booksApi'
import { isGuestMode } from '../guestMode'

vi.mock('@/utils/imageFetcher')
vi.mock('../booksApi')
vi.mock('../guestMode')

describe('ensureCoverCached', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isGuestMode.mockReturnValue(false)
  })

  it('does nothing when the book has no coverLink', async () => {
    const result = await ensureCoverCached({ id: 'b1', coverLink: null, hasCachedCover: false })
    expect(result).toBeNull()
    expect(fetchImageAsFile).not.toHaveBeenCalled()
  })

  it('does nothing when the cover is already cached', async () => {
    const result = await ensureCoverCached({ id: 'b1', coverLink: 'https://x/y.jpg', hasCachedCover: true })
    expect(result).toBeNull()
    expect(fetchImageAsFile).not.toHaveBeenCalled()
  })

  it('does nothing in guest mode', async () => {
    isGuestMode.mockReturnValue(true)
    const result = await ensureCoverCached({ id: 'guest-1', coverLink: 'https://x/y.jpg', hasCachedCover: false })
    expect(result).toBeNull()
    expect(fetchImageAsFile).not.toHaveBeenCalled()
  })

  it('fetches client-side and uploads when the server could not cache it', async () => {
    const fakeFile = new File(['x'], 'cover.jpg', { type: 'image/jpeg' })
    fetchImageAsFile.mockResolvedValue({ success: true, file: fakeFile })
    booksApi.uploadBookCover.mockResolvedValue({ id: 'b1', hasCachedCover: true })

    const result = await ensureCoverCached({ id: 'b1', coverLink: 'https://x/y.jpg', hasCachedCover: false })

    expect(fetchImageAsFile).toHaveBeenCalledWith('https://x/y.jpg', 'cover')
    expect(booksApi.uploadBookCover).toHaveBeenCalledWith('b1', fakeFile)
    expect(result).toEqual({ id: 'b1', hasCachedCover: true })
  })

  it('returns null when the client-side fetch also fails', async () => {
    fetchImageAsFile.mockResolvedValue({ success: false, error: 'CORS or network error' })

    const result = await ensureCoverCached({ id: 'b1', coverLink: 'https://x/y.jpg', hasCachedCover: false })

    expect(result).toBeNull()
    expect(booksApi.uploadBookCover).not.toHaveBeenCalled()
  })

  it('returns null when the upload itself fails', async () => {
    const fakeFile = new File(['x'], 'cover.jpg', { type: 'image/jpeg' })
    fetchImageAsFile.mockResolvedValue({ success: true, file: fakeFile })
    booksApi.uploadBookCover.mockRejectedValue(new Error('422'))

    const result = await ensureCoverCached({ id: 'b1', coverLink: 'https://x/y.jpg', hasCachedCover: false })

    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run and verify these fail**

Run: `cd frontend && npx vitest run src/services/__tests__/coverCache.spec.js`
Expected: FAIL — `Cannot find module '../coverCache'`.

- [ ] **Step 3: Implement**

```js
// frontend/src/services/coverCache.js
import { fetchImageAsFile } from '@/utils/imageFetcher'
import { booksApi } from './booksApi'
import { isGuestMode } from './guestMode'
import { logger } from '@/utils/logger'

/**
 * Fallback for a book whose cover_url the server couldn't cache (e.g. a
 * host that blocks server-side/datacenter IPs). Fetches the image
 * client-side (the same validated path the Edit Cover modal already uses)
 * and uploads the result, letting the backend hash-dedupe it. Fire-and-forget
 * from the caller's perspective — returns null on any failure rather than
 * throwing, since a missing cache is not a user-facing error here.
 */
export async function ensureCoverCached(book) {
  if (!book?.coverLink || book.hasCachedCover || isGuestMode()) {
    return null
  }

  const fetchResult = await fetchImageAsFile(book.coverLink, 'cover')
  if (!fetchResult.success) {
    logger.debug('[CoverCache] Client-side fallback fetch failed:', fetchResult.error)
    return null
  }

  try {
    return await booksApi.uploadBookCover(book.id, fetchResult.file)
  } catch (error) {
    logger.debug('[CoverCache] Fallback upload failed:', error)
    return null
  }
}
```

- [ ] **Step 4: Run and verify the tests pass**

Run: `cd frontend && npx vitest run src/services/__tests__/coverCache.spec.js`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/coverCache.js frontend/src/services/__tests__/coverCache.spec.js
git commit -m "Add client-side-fetch fallback for covers the server couldn't cache"
```

---

## Task 14: Frontend — wire the fallback into create/update success

**Files:**
- Modify: `frontend/src/composables/useBooksQuery.js:43-49` (`useCreateBook`'s `onSuccess`), `frontend/src/composables/useBooksQuery.js:89-95` (`useUpdateBook`'s `onSuccess`)
- Test: `frontend/src/composables/__tests__/useBooksQuery.spec.js` (create if it doesn't already exist — check first)

**Interfaces:**
- Consumes: `ensureCoverCached` (Task 13).
- Produces: after a successful create or update, if `ensureCoverCached` resolves a patched book, the query cache is updated with it. This is the last piece — after this task, adding a book via search or editing a cover both flow through the full caching mechanism.

- [ ] **Step 1: Check for an existing test file**

Run: `ls frontend/src/composables/__tests__/useBooksQuery.spec.js 2>&1` — if it exists, read it fully first and match its mocking style; if not, this task creates it fresh, mocking `@/services/booksApi` and `@tanstack/vue-query` the way sibling composable tests in this directory do (check `useAddBookFlow.spec.js` for the project's usual Vue Query test setup).

- [ ] **Step 2: Write the failing test**

```js
// frontend/src/composables/__tests__/useBooksQuery.spec.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient } from '@tanstack/vue-query'
import { useCreateBook } from '../useBooksQuery'
import { booksApi } from '@/services/booksApi'
import { ensureCoverCached } from '@/services/coverCache'

vi.mock('@/services/booksApi')
vi.mock('@/services/coverCache')

// Minimal harness: run the mutation's onSuccess directly against a real
// QueryClient so cache patching can be asserted without mounting a component.
function withQueryClient(fn) {
  const queryClient = new QueryClient()
  return fn(queryClient)
}

describe('useCreateBook cover-cache fallback', () => {
  beforeEach(() => vi.clearAllMocks())

  it('patches the cache when ensureCoverCached resolves a cached cover', async () => {
    await withQueryClient(async (queryClient) => {
      queryClient.setQueryData(['books'], [{ id: 'temp-1', name: 'Book' }])
      booksApi.createBook.mockResolvedValue({ id: 'b1', name: 'Book', coverLink: 'https://x/y.jpg', hasCachedCover: false })
      ensureCoverCached.mockResolvedValue({ id: 'b1', name: 'Book', hasCachedCover: true, coverDisplayLink: 'https://cached/y.jpg' })

      const { mutateAsync } = useCreateBook()
      await mutateAsync({ tempId: 'temp-1', book: { name: 'Book', coverLink: 'https://x/y.jpg' } })
      await vi.waitFor(() => expect(ensureCoverCached).toHaveBeenCalled())
      await new Promise((resolve) => setTimeout(resolve, 0)) // let the fire-and-forget .then() run

      const cached = queryClient.getQueryData(['books'])
      expect(cached.find((b) => b.id === 'b1').coverDisplayLink).toBe('https://cached/y.jpg')
    })
  })
})
```

Note: this test's exact harness (how `useCreateBook`'s internal `useQueryClient()` gets the same `queryClient` instance used for assertions) must follow whatever pattern this project's Vue Query tests already use — check `useAddBookFlow.spec.js` or any other composable test using `@tanstack/vue-query` for the established `VueQueryPlugin`/provide setup before finalizing this test's scaffolding, and adjust the harness above to match rather than inventing a new pattern.

- [ ] **Step 3: Run and verify it fails**

Run: `cd frontend && npx vitest run src/composables/__tests__/useBooksQuery.spec.js`
Expected: FAIL — cache still shows the original `coverDisplayLink`/no patch happened, since `onSuccess` doesn't call `ensureCoverCached` yet.

- [ ] **Step 4: Implement**

```js
// frontend/src/composables/useBooksQuery.js — add the import
import { ensureCoverCached } from '@/services/coverCache'

// replace useCreateBook's onSuccess (around lines 43-49)
    onSuccess: (createdBook, _variables, context) => {
      const current = queryClient.getQueryData(BOOKS_QUERY_KEY) ?? []
      queryClient.setQueryData(
        BOOKS_QUERY_KEY,
        current.map((book) => (book.id === context.tempId ? createdBook : book))
      )

      ensureCoverCached(createdBook).then((patchedBook) => {
        if (!patchedBook) return
        const latest = queryClient.getQueryData(BOOKS_QUERY_KEY) ?? []
        queryClient.setQueryData(
          BOOKS_QUERY_KEY,
          latest.map((book) => (book.id === patchedBook.id ? patchedBook : book))
        )
      })
    },

// replace useUpdateBook's onSuccess (around lines 89-95)
    onSuccess: (updatedBook) => {
      const current = queryClient.getQueryData(BOOKS_QUERY_KEY) ?? []
      queryClient.setQueryData(
        BOOKS_QUERY_KEY,
        current.map((book) => (book.id === updatedBook.id ? updatedBook : book))
      )

      ensureCoverCached(updatedBook).then((patchedBook) => {
        if (!patchedBook) return
        const latest = queryClient.getQueryData(BOOKS_QUERY_KEY) ?? []
        queryClient.setQueryData(
          BOOKS_QUERY_KEY,
          latest.map((book) => (book.id === patchedBook.id ? patchedBook : book))
        )
      })
    },
```

- [ ] **Step 5: Run and verify the test passes**

Run: `cd frontend && npx vitest run src/composables/__tests__/useBooksQuery.spec.js`
Expected: pass.

- [ ] **Step 6: Run the full frontend suite**

Run: `cd frontend && npx vitest run`
Expected: all pass.

- [ ] **Step 7: Lint**

Run: `cd frontend && npx eslint src/services/booksApi.js src/services/coverCache.js src/composables/useBooksQuery.js --fix`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/composables/useBooksQuery.js frontend/src/composables/__tests__/useBooksQuery.spec.js
git commit -m "Trigger the cover-cache fallback after a book is created or updated"
```

---

## Final check

- [ ] Run the full backend and frontend test suites once more (`cd backend && npm test`, `cd frontend && npx vitest run`) and confirm everything is green.
- [ ] Re-run Task 10's manual verification end to end once more against the final code (not just Task 8/9's state) to catch any regression introduced by Tasks 11-14 touching the same book records via the REST API in a different shape.
- [ ] Confirm `git log` on this branch shows one commit per task, each with passing tests at that point.
