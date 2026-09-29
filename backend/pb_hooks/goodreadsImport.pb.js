/// <reference path="../pb_data/types.d.ts" />

// Imports a Goodreads library export (Settings -> Export Library, a CSV) for
// the authenticated user. Separate from /api/books/import, which speaks the
// app's own JSON export format. Books already in the user's library (same
// title + author) are skipped; covers are not touched here.
//
// Parsing, guardrails and row mapping live in goodreadsImport.js so they can
// be unit-tested. routerAdd handlers don't close over top-level variables,
// so that module is required inside the handler.

routerAdd(
  "POST",
  "/api/books/import/goodreads",
  (e) => {
    const { MAX_BODY_BYTES, parseGoodreadsCsv, mapRow } =
      require(`${__hooks}/goodreadsImport.js`)

    let text
    try {
      text = readerToString(e.request.body, MAX_BODY_BYTES)
    } catch (err) {
      throw new ApiError(413, "File too large", null)
    }

    let rows
    try {
      rows = parseGoodreadsCsv(text)
    } catch (err) {
      if (err && err.isImportError) {
        throw new BadRequestError(err.message)
      }
      throw err
    }

    const collection = $app.findCollectionByNameOrId("books")
    const existing = $app.findRecordsByFilter(
      collection,
      "owner = {:owner}",
      "",
      0,
      0,
      { owner: e.auth.id }
    )
    const seen = new Set(
      existing.map((r) => `${r.get("name")}\u0000${r.get("author") || ""}`)
    )

    let imported = 0
    let skipped = 0
    const errors = []

    rows.forEach((row, index) => {
      const { book, error } = mapRow(row)
      if (error) {
        errors.push({ index, reason: error })
        return
      }

      const key = `${book.name}\u0000${book.author}`
      if (seen.has(key)) {
        skipped++
        return
      }

      const record = new Record(collection)
      record.set("owner", e.auth.id)
      record.set("name", book.name)
      record.set("author", book.author)
      record.set("read_date", book.read_date || "")
      record.set("attributes", book.attributes)

      try {
        $app.save(record)
        seen.add(key)
        imported++
      } catch (err) {
        errors.push({ index, reason: `${err}` })
      }
    })

    return e.json(200, { imported, skipped, errors })
  },
  $apis.requireAuth(),
  $apis.bodyLimit(10 * 1024 * 1024)
)
