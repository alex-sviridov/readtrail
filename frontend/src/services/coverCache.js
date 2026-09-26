import { fetchImageAsFile } from '@/utils/imageFetcher'
import { booksApi } from './booksApi'
import { isGuestMode } from './guestMode'
import { logger } from '@/utils/logger'

/**
 * Fallback for a book whose cover_url the server couldn't cache (e.g. a
 * host that blocks server-side/datacenter IPs). Fetches the image
 * client-side (the same validated path the Edit Cover modal already uses)
 * and uploads the result, letting the backend hash-dedupe it. Fire-and-forget
 * from the caller's perspective — returns null on any failure rather than
 * throwing, since a missing cache is not a user-facing error here.
 */
export async function ensureCoverCached(book) {
  if (!book?.coverLink || book.hasCachedCover || isGuestMode()) {
    return null
  }

  const fetchResult = await fetchImageAsFile(book.coverLink, 'cover')
  if (!fetchResult.success) {
    logger.debug('[CoverCache] Client-side fallback fetch failed:', fetchResult.error)
    return null
  }

  try {
    return await booksApi.uploadBookCover(book.id, fetchResult.file)
  } catch (error) {
    logger.debug('[CoverCache] Fallback upload failed:', error)
    return null
  }
}
