// Pure logic for the /api/books/search route, kept free of PocketBase's
// $app/$http/routerAdd globals so it can run under a normal JS test runner
// (the JSVM hooks themselves can't be unit-tested without the real
// PocketBase binary). bookSearch.pb.js requires this file and wires it up.

const OPEN_LIBRARY_SEARCH_URL = 'https://openlibrary.org/search.json'
const SEARCH_LIMIT = 20

function buildOpenLibraryUrl({ title, author }) {
  const params = []
  const trimmedTitle = (title || '').trim()
  const trimmedAuthor = (author || '').trim()

  if (trimmedTitle) {
    params.push(`title=${encodeURIComponent(trimmedTitle)}`)
  }
  if (trimmedAuthor) {
    params.push(`author=${encodeURIComponent(trimmedAuthor)}`)
  }

  if (params.length === 0) {
    return null
  }

  params.push(`limit=${SEARCH_LIMIT}`)
  return `${OPEN_LIBRARY_SEARCH_URL}?${params.join('&')}`
}

function shapeUpstreamResult({ ok, statusCode, json, threw }) {
  if (threw) {
    return { status: 502, body: { error: 'Failed to reach Open Library' } }
  }

  if (!ok) {
    return {
      status: statusCode,
      body: { error: `Open Library search failed with status ${statusCode}` }
    }
  }

  return { status: 200, body: { docs: (json && json.docs) || [] } }
}

module.exports = { buildOpenLibraryUrl, shapeUpstreamResult }
