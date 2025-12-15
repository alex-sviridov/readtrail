/**
 * Image fetching utility
 * Handles fetching images from URLs and converting them to File objects
 * for client-side processing and upload
 */

import { logger } from './logger'

// Constants
const FETCH_TIMEOUT_MS = 30_000
const BYTES_PER_MB = 1024 * 1024
const MAX_FILE_SIZE_MB = 10
const WARN_FILE_SIZE_MB = 5

const MIME_TO_EXTENSION = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico'
}

/**
 * Create error result object
 * @private
 */
function createErrorResult(error, file = null) {
  return { success: false, error, ...(file && { file }) }
}

/**
 * Create success result object
 * @private
 */
function createSuccessResult(file, warning = null) {
  return { success: true, file, ...(warning && { warning }) }
}

/**
 * Validate if a URL is properly formatted
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
export function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false

  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Get file extension from URL or content-type header
 * @param {string} url - Image URL
 * @param {string} contentType - Content-Type header value
 * @returns {string} File extension (jpg, png, etc.)
 */
export function getImageExtension(url, contentType) {
  // Try content-type first
  if (contentType) {
    const mimeType = contentType.split(';')[0].trim().toLowerCase()
    const extension = MIME_TO_EXTENSION[mimeType]
    if (extension) return extension
  }

  // Fallback to URL extension
  try {
    const extension = new URL(url).pathname.match(/\.([a-z0-9]+)$/i)?.[1]
    if (extension) return extension.toLowerCase()
  } catch {
    // Invalid URL
  }

  return 'jpg' // Default fallback
}

/**
 * Validate file size and return warning if large
 * @param {File} file - File object to validate
 * @param {number} maxSizeMB - Warning threshold in MB (default: 5)
 * @returns {Object} Validation result with {valid, warning, error}
 */
export function validateFileSize(file, maxSizeMB = WARN_FILE_SIZE_MB) {
  const sizeInMB = file.size / BYTES_PER_MB

  if (sizeInMB > MAX_FILE_SIZE_MB) {
    return {
      valid: false,
      error: `Image too large (${sizeInMB.toFixed(1)}MB). Max ${MAX_FILE_SIZE_MB}MB.`
    }
  }

  if (sizeInMB > maxSizeMB) {
    return {
      valid: true,
      warning: `Large image (${sizeInMB.toFixed(1)}MB). Upload may be slow.`
    }
  }

  return { valid: true }
}

/**
 * Fetch an image from a URL and convert it to a File object
 * Handles CORS, timeouts, and invalid responses
 *
 * @param {string} url - Image URL to fetch
 * @param {string} filename - Base filename (without extension)
 * @returns {Promise<Object>} Result object with {success, file?, error?, warning?}
 */
export async function fetchImageAsFile(url, filename = 'cover') {
  if (!isValidImageUrl(url)) {
    return createErrorResult('Invalid URL format')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    logger.debug('[ImageFetcher] Fetching:', url)

    const response = await fetch(url, {
      mode: 'cors',
      signal: controller.signal,
      headers: { Accept: 'image/*' }
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      logger.warn('[ImageFetcher] HTTP error:', response.status)
      return createErrorResult(`HTTP ${response.status}`)
    }

    const contentType = response.headers.get('content-type')
    if (!contentType?.startsWith('image/')) {
      logger.warn('[ImageFetcher] Invalid content-type:', contentType)
      return createErrorResult('URL does not point to an image')
    }

    const blob = await response.blob()
    const extension = getImageExtension(url, contentType)
    const file = new File([blob], `${filename}.${extension}`, { type: contentType })

    logger.info('[ImageFetcher] Fetched:', {
      size: `${(file.size / 1024).toFixed(1)}KB`,
      type: file.type
    })

    const validation = validateFileSize(file)

    return validation.valid
      ? createSuccessResult(file, validation.warning)
      : createErrorResult(validation.error, file)

  } catch (error) {
    logger.error('[ImageFetcher] Failed:', error)

    if (error.name === 'AbortError') {
      return createErrorResult('Request timeout')
    }

    if (error.message.includes('Failed to fetch')) {
      return createErrorResult('CORS or network error')
    }

    return createErrorResult(error.message || 'Unknown error')
  } finally {
    clearTimeout(timeoutId)
  }
}
