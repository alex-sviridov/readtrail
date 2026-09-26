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
