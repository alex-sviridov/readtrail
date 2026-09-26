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
