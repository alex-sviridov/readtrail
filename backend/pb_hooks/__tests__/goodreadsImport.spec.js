import { describe, it, expect } from 'vitest'
import {
  parseCsv,
  parseGoodreadsCsv,
  parseReadDate,
  mapReadDate,
  mapScore,
  mapRow,
  cleanTitleForSearch,
  buildCoverSearchUrl,
  pickCoverUrl,
  MAX_ROWS
} from '../goodreadsImport.js'

const HEADER = 'Book Id,Title,Author,ISBN,My Rating,Date Read,Exclusive Shelf,My Review'

describe('parseCsv', () => {
  it('handles quoted commas, escaped quotes and embedded newlines', () => {
    const rows = parseCsv('a,"b,c","say ""hi""","line1\nline2"\r\nd,e,f,g\n')
    expect(rows).toEqual([
      ['a', 'b,c', 'say "hi"', 'line1\nline2'],
      ['d', 'e', 'f', 'g']
    ])
  })

  it('strips a UTF-8 BOM and keeps a final row with no trailing newline', () => {
    expect(parseCsv('﻿a,b\nc,d')).toEqual([['a', 'b'], ['c', 'd']])
  })

  it('throws on an unterminated quoted field', () => {
    expect(() => parseCsv('a,"b\nc')).toThrow(/unterminated/)
  })
})

describe('parseGoodreadsCsv', () => {
  it('returns header-keyed rows, ignoring blank lines', () => {
    const rows = parseGoodreadsCsv(`${HEADER}\n1,Pale Fire,Vladimir Nabokov,"=""0141185260""",0,,to-read,\n\n`)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ Title: 'Pale Fire', Author: 'Vladimir Nabokov', 'Exclusive Shelf': 'to-read' })
  })

  it('rejects empty input', () => {
    expect(() => parseGoodreadsCsv('  \n')).toThrow(/empty/)
  })

  it('rejects binary input', () => {
    expect(() => parseGoodreadsCsv('PK\u0003\u0004\u0000\u0000')).toThrow(/not a text CSV/)
  })

  it('rejects a CSV without Title/Author columns', () => {
    expect(() => parseGoodreadsCsv('foo,bar\n1,2\n')).toThrow(/missing column\(s\) Title, Author/)
  })

  it('rejects JSON sent instead of CSV', () => {
    expect(() => parseGoodreadsCsv('{"version":1,"books":[]}')).toThrow(/Not a Goodreads export/)
  })

  it('rejects more than MAX_ROWS rows', () => {
    const body = Array.from({ length: MAX_ROWS + 1 }, (_, i) => `${i},Book ${i},Author`).join('\n')
    expect(() => parseGoodreadsCsv(`Book Id,Title,Author\n${body}`)).toThrow(/Too many rows/)
  })
})

describe('parseReadDate', () => {
  it('maps YYYY/MM/DD to the first of the month', () => {
    expect(parseReadDate('2017/11/12')).toBe('2017-11-01')
  })

  it('accepts YYYY/MM and dashed dates', () => {
    expect(parseReadDate('2017/3')).toBe('2017-03-01')
    expect(parseReadDate('2017-03-09')).toBe('2017-03-01')
  })

  it('returns null for blank, malformed or out-of-range dates', () => {
    expect(parseReadDate('')).toBeNull()
    expect(parseReadDate('yesterday')).toBeNull()
    expect(parseReadDate('2017/13/01')).toBeNull()
    expect(parseReadDate('1800/01/01')).toBeNull()
    expect(parseReadDate('2100/01/01')).toBeNull()
  })
})

describe('mapReadDate', () => {
  it('uses the read date for read books', () => {
    expect(mapReadDate('read', '2017/11/12')).toBe('2017-11-01')
  })

  it('falls back to "read lately" when a read book has no usable date', () => {
    expect(mapReadDate('read', '')).toBe('1910-01-01')
    expect(mapReadDate('', '')).toBe('1910-01-01')
  })

  it('maps to-read to the to-read sentinel', () => {
    expect(mapReadDate('to-read', '')).toBe('2100-01-01')
  })

  it('leaves currently-reading books without a date', () => {
    expect(mapReadDate('currently-reading', '')).toBeNull()
  })
})

describe('mapScore', () => {
  it.each([
    ['1', -1],
    ['2', -1],
    ['3', null],
    ['4', null],
    ['5', 1],
    ['0', null],
    ['', null]
  ])('rating %j -> %j', (rating, expected) => {
    expect(mapScore(rating)).toBe(expected)
  })
})

describe('mapRow', () => {
  it('maps a full row', () => {
    const { book } = mapRow({
      Title: ' Nixonland ',
      Author: 'Rick Perlstein',
      'My Rating': '5',
      'Date Read': '2017/11/11',
      'Exclusive Shelf': 'read'
    })
    expect(book).toEqual({
      name: 'Nixonland',
      author: 'Rick Perlstein',
      read_date: '2017-11-01',
      attributes: { isUnfinished: false, customCover: false, score: 1 }
    })
  })

  it('allows an empty author', () => {
    expect(mapRow({ Title: 'Anonymous Work', Author: '' }).book.author).toBe('')
  })

  it('truncates overlong titles', () => {
    expect(mapRow({ Title: 'x'.repeat(200), Author: 'Some Author' }).book.name).toHaveLength(128)
  })

  it('reports rows that violate the books collection limits', () => {
    expect(mapRow({ Title: '', Author: 'Some Author' }).error).toMatch(/Title/)
    expect(mapRow({ Title: 'Kim', Author: 'Some Author' }).error).toMatch(/shorter than 4/)
    expect(mapRow({ Title: 'Valid Title', Author: 'Bo' }).error).toMatch(/Author/)
  })
})

describe('cleanTitleForSearch', () => {
  it('drops a trailing series note', () => {
    expect(cleanTitleForSearch('Dune (Dune, #1)')).toBe('Dune')
  })

  it('keeps subtitles and mid-title parentheses', () => {
    expect(cleanTitleForSearch('Nixonland: The Rise of a President')).toBe('Nixonland: The Rise of a President')
    expect(cleanTitleForSearch('A (Very) Long Road')).toBe('A (Very) Long Road')
  })

  it('never returns an empty string', () => {
    expect(cleanTitleForSearch('(Untitled)')).toBe('(Untitled)')
  })
})

describe('buildCoverSearchUrl', () => {
  it('searches by title and author, encoded', () => {
    expect(buildCoverSearchUrl({ name: 'Dune (Dune, #1)', author: 'Frank Herbert' })).toBe(
      'https://openlibrary.org/search.json?title=Dune&author=Frank%20Herbert&fields=cover_i&limit=20'
    )
  })

  it('searches by title only when there is no author', () => {
    expect(buildCoverSearchUrl({ name: 'Anonymous Work', author: '' })).toBe(
      'https://openlibrary.org/search.json?title=Anonymous%20Work&fields=cover_i&limit=20'
    )
  })
})

describe('pickCoverUrl', () => {
  it('takes the first result that has a cover', () => {
    expect(pickCoverUrl({ docs: [{}, { cover_i: 111 }, { cover_i: 222 }] })).toBe(
      'https://covers.openlibrary.org/b/id/111-M.jpg'
    )
  })

  it('returns null when nothing has a usable cover', () => {
    expect(pickCoverUrl({ docs: [{}, { cover_i: 0 }, { cover_i: 'x' }] })).toBeNull()
    expect(pickCoverUrl({ docs: [] })).toBeNull()
    expect(pickCoverUrl({})).toBeNull()
    expect(pickCoverUrl(null)).toBeNull()
  })
})
