/// <reference path="../pb_data/types.d.ts" />

// Proxies OpenLibrary book search through our own API so the frontend never
// talks to a third-party service directly. Public (no e.auth check) so
// guest-mode users can still search, matching the pre-existing behavior of
// calling OpenLibrary straight from the browser.
//
// URL-building and response-shaping logic lives in bookSearch.js (a plain
// module, not suffixed .pb.js so PocketBase doesn't auto-load it as a route)
// so it can be unit-tested without the PocketBase JSVM runtime.
//
// Note: routerAdd handlers are compiled standalone by the JSVM and do not
// close over top-level variables, so bookSearch.js is required fresh inside
// the handler rather than destructured at the top level.

routerAdd("GET", "/api/books/search", (e) => {
  const { buildOpenLibraryUrl, shapeUpstreamResult } = require(`${__hooks}/bookSearch.js`)

  const url = buildOpenLibraryUrl({
    title: e.request.url.query().get("title"),
    author: e.request.url.query().get("author")
  })

  if (!url) {
    throw new BadRequestError("Provide a 'title' and/or 'author' query parameter")
  }

  let result
  try {
    const res = $http.send({ url, method: "GET", timeout: 10 })
    result = { ok: res.statusCode >= 200 && res.statusCode < 300, statusCode: res.statusCode, json: res.json }
  } catch {
    result = { threw: true }
  }

  const { status, body } = shapeUpstreamResult(result)
  return e.json(status, body)
})
