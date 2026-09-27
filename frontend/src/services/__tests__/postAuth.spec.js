import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { completeRegisterAndRedirect, completeLoginAndRedirect } from '../postAuth'
import { queryClient } from '../queryClient'
import { clearGuestData } from '../guestStore'

vi.mock('../guestStore')

describe('completeRegisterAndRedirect', () => {
  let originalLocation

  beforeEach(() => {
    vi.spyOn(queryClient, 'clear')
    originalLocation = window.location
    delete window.location
    window.location = { href: '' }
  })

  afterEach(() => {
    window.location = originalLocation
  })

  it('migrates guest data to the new account, clears the query cache, and redirects', async () => {
    const performMigration = vi.fn().mockResolvedValue({ success: true })
    const booksStore = { books: [{ id: '1' }], performMigration }

    await completeRegisterAndRedirect(booksStore)

    expect(performMigration).toHaveBeenCalledTimes(1)
    expect(queryClient.clear).toHaveBeenCalled()
    expect(window.location.href).toBe('/library')
  })

  it('skips migration when there is no guest data, but still clears the cache and redirects', async () => {
    const performMigration = vi.fn()
    const booksStore = { books: [], performMigration }

    await completeRegisterAndRedirect(booksStore)

    expect(performMigration).not.toHaveBeenCalled()
    expect(queryClient.clear).toHaveBeenCalled()
    expect(window.location.href).toBe('/library')
  })
})

describe('completeLoginAndRedirect', () => {
  let originalLocation

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(queryClient, 'clear')
    originalLocation = window.location
    delete window.location
    window.location = { href: '' }
  })

  afterEach(() => {
    window.location = originalLocation
  })

  it('discards local guest data without migrating it, clears the query cache, and redirects', async () => {
    const performMigration = vi.fn()
    const booksStore = { books: [{ id: '1' }], performMigration }

    await completeLoginAndRedirect(booksStore)

    expect(performMigration).not.toHaveBeenCalled()
    expect(clearGuestData).toHaveBeenCalledTimes(1)
    expect(queryClient.clear).toHaveBeenCalled()
    expect(window.location.href).toBe('/library')
  })

  it('does nothing extra when there is no guest data, but still clears the cache and redirects', async () => {
    const performMigration = vi.fn()
    const booksStore = { books: [], performMigration }

    await completeLoginAndRedirect(booksStore)

    expect(performMigration).not.toHaveBeenCalled()
    expect(clearGuestData).not.toHaveBeenCalled()
    expect(queryClient.clear).toHaveBeenCalled()
    expect(window.location.href).toBe('/library')
  })
})
