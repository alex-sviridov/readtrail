import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TIMINGS } from '@/constants'
import { useOpenLibrarySearch } from '../useOpenLibrarySearch'

describe('useOpenLibrarySearch', () => {
  let mockFetch

  beforeEach(() => {
    mockFetch = vi.fn()
    global.fetch = mockFetch
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('does not search until debounce elapses', () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ docs: [] }) })
    const { titleQuery, handleSearchInput } = useOpenLibrarySearch()

    titleQuery.value = '1984'
    handleSearchInput()

    expect(mockFetch).not.toHaveBeenCalled()
    vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('actually aborts the in-flight fetch when the client-side timeout fires', async () => {
    let capturedSignal
    mockFetch.mockImplementation((url, options) => {
      capturedSignal = options.signal
      return new Promise(() => {}) // never resolves on its own
    })

    const { titleQuery, handleSearchInput } = useOpenLibrarySearch()
    titleQuery.value = '1984'
    handleSearchInput()
    vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)

    expect(capturedSignal.aborted).toBe(false)

    vi.advanceTimersByTime(TIMINGS.API_TIMEOUT + 1)
    await vi.waitFor(() => expect(capturedSignal.aborted).toBe(true))
  })

  it('surfaces a timeout error message after the request is aborted by the timeout', async () => {
    mockFetch.mockImplementation((url, options) => new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => {
        const abortError = new Error('The operation was aborted')
        abortError.name = 'AbortError'
        reject(abortError)
      })
    }))

    const { titleQuery, error, handleSearchInput } = useOpenLibrarySearch()
    titleQuery.value = '1984'
    handleSearchInput()
    vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)
    vi.advanceTimersByTime(TIMINGS.API_TIMEOUT + 1)

    await vi.waitFor(() => expect(error.value).toContain('timed out'))
  })

  it('cancels the previous request without surfacing a timeout error when a newer search supersedes it', async () => {
    let firstSignal
    mockFetch.mockImplementationOnce((url, options) => {
      firstSignal = options.signal
      return new Promise(() => {})
    })
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ docs: [] }) })

    const { titleQuery, error, handleSearchInput } = useOpenLibrarySearch()
    titleQuery.value = 'First'
    handleSearchInput()
    vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)

    titleQuery.value = 'Second'
    handleSearchInput()
    vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))

    expect(firstSignal.aborted).toBe(true)
    expect(error.value).toBeNull()
  })

  it('maps a non-ok response status to a readable error message', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 429 })

    const { titleQuery, error, handleSearchInput } = useOpenLibrarySearch()
    titleQuery.value = '1984'
    handleSearchInput()
    vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)

    await vi.waitFor(() => expect(error.value).toContain('Too many requests'))
  })

  it('reset clears query, results and error state', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ docs: [{ key: '/works/1', title: '1984' }] })
    })

    const { titleQuery, searchResults, reset, handleSearchInput } = useOpenLibrarySearch()
    titleQuery.value = '1984'
    handleSearchInput()
    vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)
    await vi.waitFor(() => expect(searchResults.value).toHaveLength(1))

    reset()

    expect(titleQuery.value).toBe('')
    expect(searchResults.value).toHaveLength(0)
  })

  it('cleanup aborts any pending request without throwing', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}))
    const { titleQuery, handleSearchInput, cleanup } = useOpenLibrarySearch()

    titleQuery.value = '1984'
    handleSearchInput()
    vi.advanceTimersByTime(TIMINGS.SEARCH_DEBOUNCE)

    expect(() => cleanup()).not.toThrow()
  })
})
