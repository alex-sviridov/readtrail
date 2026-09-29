import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { useGoodreadsImport } from '../useGoodreadsImport'
import { BOOKS_QUERY_KEY } from '@/composables/useBooksQuery'
import pb from '@/services/pocketbase'

vi.mock('@/composables/useBooksQuery', () => ({
  BOOKS_QUERY_KEY: ['books']
}))

vi.mock('@/services/pocketbase', () => ({
  default: { send: vi.fn() }
}))

vi.mock('@/services/booksApi', () => ({
  booksApi: { getBooks: vi.fn().mockResolvedValue([]) }
}))

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
}))

const csvFile = (count, { name = 'goodreads_library_export.csv', titlePrefix = 'Book Title' } = {}) => {
  const lines = Array.from({ length: count }, (_, i) => `${i},${titlePrefix} ${i},Some Author,0,,read,`)
  return new File([`Book Id,Title,Author,My Rating,Date Read,Exclusive Shelf,My Review\n${lines.join('\n')}`], name)
}

const callsTo = (path) => pb.send.mock.calls.filter(([p]) => p === path)

describe('useGoodreadsImport', () => {
  let queryClient
  let wrapper
  let api

  const mountComposable = () => {
    wrapper = mount(
      defineComponent({
        setup() {
          api = useGoodreadsImport()
          return () => null
        }
      }),
      { global: { plugins: [[VueQueryPlugin, { queryClient }]] } }
    )
  }

  const run = async (file) => {
    api.importFile(file)
    await vi.waitFor(() => expect(api.result.value || api.errorMessage.value).toBeTruthy())
  }

  // Default backend: every search finds cover 7, every import saves the whole chunk.
  const defaultSend = async (path, options) => {
    if (path === '/api/books/search') return { docs: [{ cover_i: 7 }] }
    return { imported: options.body.books.length, skipped: 0, errors: [] }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(BOOKS_QUERY_KEY, [])
    vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue()
    pb.send.mockImplementation(defaultSend)
    mountComposable()
  })

  afterEach(() => {
    wrapper.unmount()
  })

  it('imports in chunks of 20 with covers attached, and refreshes books', async () => {
    await run(csvFile(45))

    const imports = callsTo('/api/books/import')
    expect(imports.map(([, o]) => o.body.books.length)).toEqual([20, 20, 5])
    expect(imports[0][1].body).toMatchObject({ version: 1 })
    expect(imports[0][1].body.books[0]).toEqual({
      name: 'Book Title 0',
      author: 'Some Author',
      read_date: '1910-01-01',
      cover_url: 'https://covers.openlibrary.org/b/id/7-M.jpg',
      attributes: { isUnfinished: false, customCover: false, score: null }
    })
    expect(api.result.value).toMatchObject({
      imported: 45,
      skipped: 0,
      errors: [],
      covers: { found: 45, notFound: 0, skipped: 0 },
      cancelled: false
    })
    expect(api.progress.value).toEqual({ done: 45, total: 45 })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: BOOKS_QUERY_KEY })
  })

  it('searches with the series note stripped from the title', async () => {
    const file = new File(['Title,Author\nDune (Dune #1),Frank Herbert'], 'lib.csv')
    await run(file)

    expect(callsTo('/api/books/search')[0][1].query).toEqual({ title: 'Dune', author: 'Frank Herbert' })
  })

  it('skips books already in the library without looking up covers', async () => {
    queryClient.setQueryData(BOOKS_QUERY_KEY, [
      { name: 'Book Title 0', author: 'Some Author' },
      { name: 'Book Title 1', author: 'Some Author' }
    ])

    await run(csvFile(3))

    expect(callsTo('/api/books/search')).toHaveLength(1)
    expect(callsTo('/api/books/import')[0][1].body.books.map((b) => b.name)).toEqual(['Book Title 2'])
    expect(api.result.value).toMatchObject({ imported: 1, skipped: 2 })
  })

  it('counts a miss when the search finds nothing or fails', async () => {
    pb.send.mockImplementation(async (path, options) => {
      if (path === '/api/books/search') {
        if (options.query.title === 'Book Title 0') return { docs: [] }
        throw { status: 502 }
      }
      return { imported: options.body.books.length, skipped: 0, errors: [] }
    })

    await run(csvFile(2))

    expect(api.result.value.covers).toEqual({ found: 0, notFound: 2, skipped: 0 })
    expect(callsTo('/api/books/import')[0][1].body.books.every((b) => !('cover_url' in b))).toBe(true)
  })

  it('stops looking up covers once Open Library rate-limits, but keeps importing', async () => {
    pb.send.mockImplementation(async (path, options) => {
      if (path === '/api/books/search') throw { status: 429 }
      return { imported: options.body.books.length, skipped: 0, errors: [] }
    })

    await run(csvFile(30))

    // Only the first concurrent batch of lookups was attempted.
    expect(callsTo('/api/books/search')).toHaveLength(3)
    expect(api.result.value).toMatchObject({ imported: 30, covers: { found: 0, notFound: 0, skipped: 30 } })
  })

  it('maps server-side errors back to CSV rows', async () => {
    pb.send.mockImplementation(async (path) => {
      if (path === '/api/books/search') return { docs: [] }
      return { imported: 1, skipped: 1, errors: [{ index: 2, reason: 'boom' }] }
    })
    const file = new File(['Title,Author\nKim,Some Author\nValid Title,Some Author\nOther Title,Some Author\nThird Title,Some Author'], 'lib.csv')

    await run(file)

    expect(api.result.value.errors).toEqual([
      { index: 0, reason: "Title 'Kim' is shorter than 4 characters" },
      { index: 3, reason: 'boom' }
    ])
    expect(api.result.value).toMatchObject({ imported: 1, skipped: 1 })
  })

  it('returns partial results when cancelled', async () => {
    pb.send.mockImplementation(async (path) => {
      if (path === '/api/books/search') return { docs: [] }
      api.cancel()
      throw Object.assign(new Error('aborted'), { isAbort: true })
    })

    await run(csvFile(45))

    expect(callsTo('/api/books/import')).toHaveLength(1)
    expect(api.result.value).toMatchObject({ imported: 0, cancelled: true })
    expect(api.errorMessage.value).toBe('')
  })

  it('reports a retryable error when a chunk fails', async () => {
    pb.send.mockImplementation(async (path) => {
      if (path === '/api/books/search') return { docs: [] }
      throw { status: 500 }
    })

    await run(csvFile(3))

    expect(api.errorMessage.value).toContain('run the import again')
    expect(api.result.value).toBeUndefined()
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: BOOKS_QUERY_KEY })
  })

  it('shows validation and parse problems without contacting the backend', async () => {
    await run(csvFile(1, { name: 'backup.json' }))
    expect(api.errorMessage.value).toContain('.csv')

    await run(new File(['foo,bar\n1,2'], 'lib.csv'))
    expect(api.errorMessage.value).toContain('missing column(s) Title, Author')

    expect(pb.send).not.toHaveBeenCalled()
  })
})
