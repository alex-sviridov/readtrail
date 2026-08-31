/// <reference path="../pb_data/types.d.ts" />

// Lets an authenticated user export their books as a portable JSON snapshot,
// and later re-import that snapshot (e.g. after a wipe, or to merge into
// another account). Existing books are matched by owner+name+author and
// skipped on import rather than duplicated or overwritten — full conflict
// resolution (merge/overwrite) is left for a future iteration.
//
// cover_file (an uploaded binary) intentionally does not travel through
// export/import — only cover_url does.

routerAdd("GET", "/api/books/export", (e) => {
  if (!e.auth) {
    throw new UnauthorizedError("Authentication required")
  }

  const books = $app.findRecordsByFilter(
    "books",
    "owner = {:owner}",
    "-created",
    0,
    0,
    { owner: e.auth.id }
  )

  return e.json(200, {
    version: 1,
    exportedAt: new Date().toISOString(),
    books: books.map((b) => ({
      name: b.get("name"),
      author: b.get("author"),
      cover_url: b.get("cover_url"),
      read_date: b.get("read_date"),
      attributes: b.get("attributes")
    }))
  })
})

routerAdd("POST", "/api/books/import", (e) => {
  if (!e.auth) {
    throw new UnauthorizedError("Authentication required")
  }

  const data = new DynamicModel({
    version: 0,
    books: []
  })
  e.bindBody(data)

  if (!Array.isArray(data.books)) {
    throw new BadRequestError("Expected a 'books' array")
  }

  const collection = $app.findCollectionByNameOrId("books")
  let imported = 0
  let skipped = 0
  const errors = []

  data.books.forEach((entry, index) => {
    if (!entry || typeof entry.name !== "string" || !entry.name) {
      errors.push({ index, reason: "Missing required field 'name'" })
      return
    }

    const author = typeof entry.author === "string" ? entry.author : ""

    // Matched in two steps rather than a single "owner = ... && author = ..."
    // filter: PocketBase's named-parameter binding resolves an empty-string
    // value to SQL NULL, so "author = {:author}" never matches a record
    // whose author is genuinely "" (the common case for books added without
    // one) — it would always report zero candidates and duplicate on
    // reimport. Filtering by owner+name only and comparing author in JS
    // sidesteps that.
    const candidates = $app.findRecordsByFilter(
      collection,
      "owner = {:owner} && name = {:name}",
      "",
      0,
      0,
      { owner: e.auth.id, name: entry.name }
    )
    if (candidates.some((r) => (r.get("author") || "") === author)) {
      skipped++
      return
    }

    const record = new Record(collection)
    record.set("owner", e.auth.id)
    record.set("name", entry.name)
    record.set("author", author)
    record.set("cover_url", typeof entry.cover_url === "string" ? entry.cover_url : "")
    record.set("read_date", entry.read_date || "")
    record.set("attributes", entry.attributes || {})

    try {
      $app.save(record)
      imported++
    } catch (err) {
      errors.push({ index, reason: `${err}` })
    }
  })

  return e.json(200, { imported, skipped, errors })
})
