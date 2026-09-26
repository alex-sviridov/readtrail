import { describe, it, expect } from 'vitest'
import { buildOpenLibraryUrl, shapeUpstreamResult } from '../bookSearch.js'

describe('buildOpenLibraryUrl', () => {
  it('returns null when title and author are both blank', () => {
    expect(buildOpenLibraryUrl({ title: '', author: '  ' })).toBeNull()
  })

  it('builds a url from title only', () => {
    const url = buildOpenLibraryUrl({ title: '1984', author: '' })
    expect(url).toBe('https://openlibrary.org/search.json?title=1984&limit=20')
  })

  it('builds a url from author only', () => {
    const url = buildOpenLibraryUrl({ title: '', author: 'Orwell' })
    expect(url).toBe('https://openlibrary.org/search.json?author=Orwell&limit=20')
  })

  it('builds a url from both title and author, trimmed and encoded', () => {
    const url = buildOpenLibraryUrl({ title: ' The Hobbit ', author: 'J.R.R. Tolkien' })
    expect(url).toBe('https://openlibrary.org/search.json?title=The%20Hobbit&author=J.R.R.%20Tolkien&limit=20')
  })
})

describe('shapeUpstreamResult', () => {
  it('returns 200 with the docs array on a successful response', () => {
    const result = shapeUpstreamResult({ ok: true, statusCode: 200, json: { docs: [{ key: '/works/1' }] } })
    expect(result).toEqual({ status: 200, body: { docs: [{ key: '/works/1' }] } })
  })

  it('defaults docs to an empty array when the upstream body has none', () => {
    const result = shapeUpstreamResult({ ok: true, statusCode: 200, json: {} })
    expect(result).toEqual({ status: 200, body: { docs: [] } })
  })

  it('forwards the upstream status code on a non-ok response', () => {
    const result = shapeUpstreamResult({ ok: false, statusCode: 429, json: null })
    expect(result).toEqual({ status: 429, body: { error: 'Open Library search failed with status 429' } })
  })

  it('maps a thrown request error (network failure or timeout) to 502', () => {
    const result = shapeUpstreamResult({ threw: true })
    expect(result).toEqual({ status: 502, body: { error: 'Failed to reach Open Library' } })
  })
})
