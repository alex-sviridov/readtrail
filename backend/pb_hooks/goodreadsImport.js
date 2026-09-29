// Pure logic for the /api/books/import/goodreads route: CSV parsing, input
// guardrails and Goodreads-row -> book mapping. Kept free of PocketBase
// globals so it can run under vitest; goodreadsImport.pb.js wires it up.

const MAX_BODY_BYTES = 10 * 1024 * 1024
const MAX_ROWS = 5000
const NAME_MIN = 4
const NAME_MAX = 128
const AUTHOR_MIN = 4
const AUTHOR_MAX = 128

// Same sentinel dates the frontend uses for status (see BOOK_STATUS).
const READ_LATELY_DATE = '1910-01-01'
const TO_READ_DATE = '2100-01-01'

const OPEN_LIBRARY_SEARCH_URL = 'https://openlibrary.org/search.json'
const OPEN_LIBRARY_COVER_URL = 'https://covers.openlibrary.org/b/id'
const COVER_SEARCH_LIMIT = 20
// Lookups are sequential and the request must finish inside the reverse
// proxy's read timeout (360s), so stop looking up covers after this long.
const COVER_LOOKUP_BUDGET_MS = 240 * 1000

const REQUIRED_COLUMNS = ['Title', 'Author']

class GoodreadsImportError extends Error {
  constructor(message) {
    super(message)
    this.isImportError = true
  }
}

// RFC 4180 parser: quoted fields may contain commas, newlines and "" escapes.
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  let i = 0

  if (text.charCodeAt(0) === 0xfeff) {
    i = 1
  }

  for (; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') {
        i++
      }
      row.push(field)
      field = ''
      rows.push(row)
      row = []
    } else {
      field += c
    }
  }

  if (inQuotes) {
    throw new GoodreadsImportError('Malformed CSV: unterminated quoted field')
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

// Returns an array of { Header: value } objects, or throws GoodreadsImportError
// when the input is not a plausible Goodreads export.
function parseGoodreadsCsv(text) {
  if (typeof text !== 'string' || text.trim() === '') {
    throw new GoodreadsImportError('The file is empty')
  }
  if (text.indexOf('\u0000') !== -1) {
    throw new GoodreadsImportError('The file is not a text CSV')
  }

  const rows = parseCsv(text).filter((r) => !(r.length === 1 && r[0].trim() === ''))
  const header = (rows.shift() || []).map((h) => h.trim())

  const missing = REQUIRED_COLUMNS.filter((c) => header.indexOf(c) === -1)
  if (missing.length > 0) {
    throw new GoodreadsImportError(
      `Not a Goodreads export: missing column(s) ${missing.join(', ')}`
    )
  }
  if (rows.length > MAX_ROWS) {
    throw new GoodreadsImportError(`Too many rows: at most ${MAX_ROWS} books per import`)
  }

  return rows.map((cells) => {
    const obj = {}
    header.forEach((h, idx) => {
      obj[h] = cells[idx] === undefined ? '' : cells[idx]
    })
    return obj
  })
}

// Goodreads writes "2017/11/12"; tolerate "2017/11" and "-" separators.
function parseReadDate(value) {
  const m = /^(\d{4})[/-](\d{1,2})(?:[/-]\d{1,2})?$/.exec((value || '').trim())
  if (!m) {
    return null
  }
  const year = Number(m[1])
  const month = Number(m[2])
  if (month < 1 || month > 12 || year <= 1910 || year >= 2100) {
    return null
  }
  return `${year}-${String(month).padStart(2, '0')}-01`
}

function mapReadDate(shelf, dateRead) {
  if (shelf === 'to-read') {
    return TO_READ_DATE
  }
  if (shelf === 'currently-reading') {
    return null
  }
  return parseReadDate(dateRead) || READ_LATELY_DATE
}

// 1-2 -> dislike, 3-4 -> no score, 5 -> like.
function mapScore(rating) {
  const n = parseInt(rating, 10)
  if (n === 5) {
    return 1
  }
  if (n >= 1 && n <= 2) {
    return -1
  }
  return null
}

// Returns { book } on success or { error } for a row that can't be imported.
function mapRow(row) {
  const name = (row['Title'] || '').trim().slice(0, NAME_MAX)
  const author = (row['Author'] || '').trim().slice(0, AUTHOR_MAX)

  if (!name) {
    return { error: "Missing required field 'Title'" }
  }
  if (name.length < NAME_MIN) {
    return { error: `Title '${name}' is shorter than ${NAME_MIN} characters` }
  }
  if (author && author.length < AUTHOR_MIN) {
    return { error: `Author '${author}' is shorter than ${AUTHOR_MIN} characters` }
  }

  return {
    book: {
      name,
      author,
      read_date: mapReadDate((row['Exclusive Shelf'] || '').trim(), row['Date Read']),
      attributes: {
        isUnfinished: false,
        customCover: false,
        score: mapScore(row['My Rating'])
      }
    }
  }
}

// Goodreads titles often end in a series note, e.g. "Dune (Dune, #1)", which
// hurts Open Library matching.
function cleanTitleForSearch(name) {
  return name.replace(/\s*\([^)]*\)\s*$/, '').trim() || name
}

function buildCoverSearchUrl({ name, author }) {
  const params = [`title=${encodeURIComponent(cleanTitleForSearch(name))}`]
  if (author) {
    params.push(`author=${encodeURIComponent(author)}`)
  }
  params.push('fields=cover_i', `limit=${COVER_SEARCH_LIMIT}`)
  return `${OPEN_LIBRARY_SEARCH_URL}?${params.join('&')}`
}

// First search result that has a cover wins. Uses the -M size, matching what
// the frontend stores for covers picked from search.
function pickCoverUrl(json) {
  const docs = json && Array.isArray(json.docs) ? json.docs : []
  const doc = docs.find((d) => d && Number.isInteger(d.cover_i) && d.cover_i > 0)
  return doc ? `${OPEN_LIBRARY_COVER_URL}/${doc.cover_i}-M.jpg` : null
}

module.exports = {
  MAX_BODY_BYTES,
  COVER_LOOKUP_BUDGET_MS,
  cleanTitleForSearch,
  buildCoverSearchUrl,
  pickCoverUrl,
  MAX_ROWS,
  GoodreadsImportError,
  parseCsv,
  parseGoodreadsCsv,
  parseReadDate,
  mapReadDate,
  mapScore,
  mapRow
}
