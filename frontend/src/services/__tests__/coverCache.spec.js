import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ensureCoverCached } from '../coverCache'
import { fetchImageAsFile } from '@/utils/imageFetcher'
import { booksApi } from '../booksApi'
import { isGuestMode } from '../guestMode'

vi.mock('@/utils/imageFetcher')
vi.mock('../booksApi')
vi.mock('../guestMode')

describe('ensureCoverCached', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isGuestMode.mockReturnValue(false)
  })

  it('does nothing when the book has no coverLink', async () => {
    const result = await ensureCoverCached({ id: 'b1', coverLink: null, hasCachedCover: false })
    expect(result).toBeNull()
    expect(fetchImageAsFile).not.toHaveBeenCalled()
  })

  it('does nothing when the cover is already cached', async () => {
    const result = await ensureCoverCached({ id: 'b1', coverLink: 'https://x/y.jpg', hasCachedCover: true })
    expect(result).toBeNull()
    expect(fetchImageAsFile).not.toHaveBeenCalled()
  })

  it('does nothing in guest mode', async () => {
    isGuestMode.mockReturnValue(true)
    const result = await ensureCoverCached({ id: 'guest-1', coverLink: 'https://x/y.jpg', hasCachedCover: false })
    expect(result).toBeNull()
    expect(fetchImageAsFile).not.toHaveBeenCalled()
  })

  it('fetches client-side and uploads when the server could not cache it', async () => {
    const fakeFile = new File(['x'], 'cover.jpg', { type: 'image/jpeg' })
    fetchImageAsFile.mockResolvedValue({ success: true, file: fakeFile })
    booksApi.uploadBookCover.mockResolvedValue({ id: 'b1', hasCachedCover: true })

    const result = await ensureCoverCached({ id: 'b1', coverLink: 'https://x/y.jpg', hasCachedCover: false })

    expect(fetchImageAsFile).toHaveBeenCalledWith('https://x/y.jpg', 'cover')
    expect(booksApi.uploadBookCover).toHaveBeenCalledWith('b1', fakeFile)
    expect(result).toEqual({ id: 'b1', hasCachedCover: true })
  })

  it('returns null when the client-side fetch also fails', async () => {
    fetchImageAsFile.mockResolvedValue({ success: false, error: 'CORS or network error' })

    const result = await ensureCoverCached({ id: 'b1', coverLink: 'https://x/y.jpg', hasCachedCover: false })

    expect(result).toBeNull()
    expect(booksApi.uploadBookCover).not.toHaveBeenCalled()
  })

  it('returns null when the upload itself fails', async () => {
    const fakeFile = new File(['x'], 'cover.jpg', { type: 'image/jpeg' })
    fetchImageAsFile.mockResolvedValue({ success: true, file: fakeFile })
    booksApi.uploadBookCover.mockRejectedValue(new Error('422'))

    const result = await ensureCoverCached({ id: 'b1', coverLink: 'https://x/y.jpg', hasCachedCover: false })

    expect(result).toBeNull()
  })
})
