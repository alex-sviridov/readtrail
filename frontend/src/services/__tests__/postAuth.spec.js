import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { completeAuthAndRedirect } from '../postAuth'
import { queryClient } from '../queryClient'

describe('completeAuthAndRedirect', () => {
  let originalLocation

  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(queryClient, 'clear')
    originalLocation = window.location
    delete window.location
    window.location = { href: '' }
  })

  afterEach(() => {
    window.location = originalLocation
  })

  it('migrates guest data, clears the leftover guest keys, clears the query cache, and redirects', async () => {
    localStorage.setItem('readtrail-books', 'some-books')
    localStorage.setItem('readtrail-needs-migration', 'true')
    const performMigration = vi.fn().mockResolvedValue({ success: true })
    const booksStore = { books: [{ id: '1' }], performMigration }

    await completeAuthAndRedirect(booksStore, 'Login')

    expect(performMigration).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('readtrail-books')).toBeNull()
    expect(localStorage.getItem('readtrail-needs-migration')).toBeNull()
    expect(queryClient.clear).toHaveBeenCalled()
    expect(window.location.href).toBe('/library')
  })

  it('skips migration when there is no guest data, but still clears the cache and redirects', async () => {
    const performMigration = vi.fn()
    const booksStore = { books: [], performMigration }

    await completeAuthAndRedirect(booksStore, 'Register')

    expect(performMigration).not.toHaveBeenCalled()
    expect(queryClient.clear).toHaveBeenCalled()
    expect(window.location.href).toBe('/library')
  })
})
