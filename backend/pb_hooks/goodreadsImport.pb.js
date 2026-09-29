/// <reference path="../pb_data/types.d.ts" />

// Imports a Goodreads library export (Settings -> Export Library, a CSV) for
// the authenticated user. Separate from /api/books/import, which speaks the
// app's own JSON export format. Books already in the user's library (same
// title + author) are skipped. For each new book, Open Library is searched by
// title + author and the first result with a cover becomes the book's
// cover_url (the books create hook then downloads and caches it). Pass
// ?covers=false to skip the lookups. Lookups never fail the import: misses
// and upstream errors just leave the book without a cover, and lookups stop
// once a time budget is spent or Open Library starts rate-limiting.
//
// Parsing, guardrails and row mapping live in goodreadsImport.js so they can
// be unit-tested. routerAdd handlers don't close over top-level variables,
// so that module is required inside the handler.

routerAdd(
  "POST",
  "/api/books/import/goodreads",
  (e) => {
    const {
      MAX_BODY_BYTES,
      COVER_LOOKUP_BUDGET_MS,
      parseGoodreadsCsv,
      mapRow,
      buildCoverSearchUrl,
      pickCoverUrl
    } = require(`${__hooks}/goodreadsImport.js`)

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

    const wantCovers = e.request.url.query().get("covers") !== "false"
    const deadline = Date.now() + COVER_LOOKUP_BUDGET_MS
    const covers = { found: 0, notFound: 0, skipped: 0 }
    let lookupsStopped = false

    const findCoverUrl = (book) => {
      if (!wantCovers) {
        return ""
      }
      if (lookupsStopped || Date.now() > deadline) {
        lookupsStopped = true
        covers.skipped++
        return ""
      }

      let coverUrl = null
      try {
        const res = $http.send({ url: buildCoverSearchUrl(book), method: "GET", timeout: 10 })
        if (res.statusCode === 429 || res.statusCode === 503) {
          lookupsStopped = true
          covers.skipped++
          return ""
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          coverUrl = pickCoverUrl(res.json)
        }
      } catch {
        // Network error or unparseable body: treat as "no cover found".
      }

      if (coverUrl) {
        covers.found++
        return coverUrl
      }
      covers.notFound++
      return ""
    }

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
      record.set("cover_url", findCoverUrl(book))
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

    return e.json(200, { imported, skipped, errors, covers })
  },
  $apis.requireAuth(),
  $apis.bodyLimit(10 * 1024 * 1024)
)
