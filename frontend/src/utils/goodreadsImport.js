/**
 * Goodreads library export (CSV) -> books in the app's own import format.
 * Pure functions only; useGoodreadsImport orchestrates the network side.
 */
import Papa from 'papaparse'
import { BOOK_STATUS } from '@/constants'
import { DEFAULT_BOOK_ATTRIBUTES } from '@/utils/bookSchema'

export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const MAX_ROWS = 5000

// Limits of the books collection's name/author fields.
const TEXT_MIN = 4
const TEXT_MAX = 128

const REQUIRED_COLUMNS = ['Title', 'Author']

export class GoodreadsImportError extends Error {}

export function validateFile(file) {
  if (!/\.csv$/i.test(file.name)) {
    throw new GoodreadsImportError('Please choose the .csv file exported from Goodreads.')
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new GoodreadsImportError('That file is too large (the limit is 10 MB).')
  }
}

export function parseGoodreadsCsv(text) {
  if (typeof text !== 'string' || text.trim() === '') {
    throw new GoodreadsImportError('The file is empty')
  }
  if (text.includes('\u0000')) {
    throw new GoodreadsImportError('The file is not a text CSV')
  }

  const { data, errors, meta } = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim()
  })

  if (errors.some((e) => e.type === 'Quotes')) {
    throw new GoodreadsImportError('Malformed CSV: unterminated quoted field')
  }
  const missing = REQUIRED_COLUMNS.filter((c) => !meta.fields.includes(c))
  if (missing.length > 0) {
    throw new GoodreadsImportError(`Not a Goodreads export: missing column(s) ${missing.join(', ')}`)
  }
  if (data.length > MAX_ROWS) {
    throw new GoodreadsImportError(`Too many rows: at most ${MAX_ROWS} books per import`)
  }

  return data
}

// Goodreads writes "2017/11/12"; tolerate "2017/11" and "-" separators.
export function parseReadDate(value) {
  const m = /^(\d{4})[/-](\d{1,2})(?:[/-]\d{1,2})?$/.exec((value || '').trim())
  if (!m) return null

  const year = Number(m[1])
  const month = Number(m[2])
  const inRange = year > BOOK_STATUS.SENTINEL_YEAR_LATELY && year < BOOK_STATUS.SENTINEL_YEAR_TO_READ
  if (month < 1 || month > 12 || !inRange) return null

  return `${year}-${String(month).padStart(2, '0')}-01`
}

export function mapReadDate(shelf, dateRead) {
  if (shelf === 'to-read') return `${BOOK_STATUS.SENTINEL_YEAR_TO_READ}-01-01`
  if (shelf === 'currently-reading') return ''
  return parseReadDate(dateRead) || `${BOOK_STATUS.SENTINEL_YEAR_LATELY}-01-01`
}

// 1-2 -> dislike, 3-4 -> no score, 5 -> like.
export function mapScore(rating) {
  const n = parseInt(rating, 10)
  if (n === 5) return 1
  if (n >= 1 && n <= 2) return -1
  return null
}

// Returns { book } in /api/books/import format, or { error } for a row that
// can't be imported.
export function mapRow(row) {
  const name = (row.Title || '').trim().slice(0, TEXT_MAX)
  const author = (row.Author || '').trim().slice(0, TEXT_MAX)

  if (!name) {
    return { error: "Missing required field 'Title'" }
  }
  if (name.length < TEXT_MIN) {
    return { error: `Title '${name}' is shorter than ${TEXT_MIN} characters` }
  }
  if (author && author.length < TEXT_MIN) {
    return { error: `Author '${author}' is shorter than ${TEXT_MIN} characters` }
  }

  return {
    book: {
      name,
      author,
      read_date: mapReadDate((row['Exclusive Shelf'] || '').trim(), row['Date Read']),
      attributes: { ...DEFAULT_BOOK_ATTRIBUTES, score: mapScore(row['My Rating']) }
    }
  }
}

// Goodreads titles often end in a series note, e.g. "Dune (Dune, #1)", which
// hurts Open Library matching.
export function cleanTitleForSearch(name) {
  return name.replace(/\s*\([^)]*\)\s*$/, '').trim() || name
}

// First search result that has a cover wins; -M matches what BookSearch stores.
export function coverUrlFromDocs(docs) {
  const doc = (docs || []).find((d) => Number.isInteger(d?.cover_i) && d.cover_i > 0)
  return doc ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : ''
}
