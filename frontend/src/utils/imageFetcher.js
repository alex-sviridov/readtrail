/**
 * Image fetching utility
 * Handles fetching images from URLs and converting them to File objects
 * for client-side processing and upload
 */

import { logger } from './logger'

// Constants
const FETCH_TIMEOUT_MS = 30_000
const BYTES_PER_KB = 1024
const MAX_FILE_SIZE_KB = 512
const WARN_FILE_SIZE_KB = 256

// Magic bytes for image format validation
const IMAGE_MAGIC_BYTES = {
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF] // JPEG
  ],
  'image/png': [
    [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] // PNG
  ],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]  // GIF89a
  ],
  'image/webp': [
    [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50] // RIFF....WEBP
  ],
  'image/bmp': [
    [0x42, 0x4D] // BM
  ]
}

// Allowed MIME types (excludes SVG and ICO for security)
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp'
])

const MIME_TO_EXTENSION = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/bmp': 'bmp'
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
 * Check if byte array matches a magic byte signature
 * @param {Uint8Array} bytes - File bytes to check
 * @param {Array} signature - Magic byte signature (null = wildcard)
 * @returns {boolean} True if bytes match signature
 * @private
 */
function matchesMagicBytes(bytes, signature) {
  if (bytes.length < signature.length) return false

  for (let i = 0; i < signature.length; i++) {
    if (signature[i] !== null && bytes[i] !== signature[i]) {
      return false
    }
  }

  return true
}

/**
 * Validate file content using magic bytes
 * @param {ArrayBuffer} arrayBuffer - File content as ArrayBuffer
 * @param {string} expectedMimeType - Expected MIME type
 * @returns {Object} Validation result with {valid, error}
 */
export async function validateImageMagicBytes(arrayBuffer, expectedMimeType) {
  const bytes = new Uint8Array(arrayBuffer)

  // Get expected signatures for this MIME type
  const signatures = IMAGE_MAGIC_BYTES[expectedMimeType]

  if (!signatures) {
    return {
      valid: false,
      error: `Unsupported image format: ${expectedMimeType}`
    }
  }

  // Check if any signature matches
  const isValid = signatures.some(signature => matchesMagicBytes(bytes, signature))

  if (!isValid) {
    logger.warn('[ImageFetcher] Magic byte mismatch:', {
      expectedMimeType,
      actualBytes: Array.from(bytes.slice(0, 12)).map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' ')
    })

    return {
      valid: false,
      error: 'File content does not match declared image format'
    }
  }

  return { valid: true }
}

/**
 * Validate MIME type is in allowlist
 * @param {string} mimeType - MIME type to validate
 * @returns {Object} Validation result with {valid, error}
 */
export function validateMimeType(mimeType) {
  if (!mimeType) {
    return {
      valid: false,
      error: 'Missing content type'
    }
  }

  const normalizedMimeType = mimeType.split(';')[0].trim().toLowerCase()

  if (!ALLOWED_MIME_TYPES.has(normalizedMimeType)) {
    return {
      valid: false,
      error: `Image format not allowed: ${normalizedMimeType}`
    }
  }

  return { valid: true, mimeType: normalizedMimeType }
}

/**
 * Validate file size and return warning if large
 * @param {File} file - File object to validate
 * @param {number} maxSizeKB - Warning threshold in KB (default: 256)
 * @returns {Object} Validation result with {valid, warning, error}
 */
export function validateFileSize(file, maxSizeKB = WARN_FILE_SIZE_KB) {
  const sizeInKB = file.size / BYTES_PER_KB

  if (sizeInKB > MAX_FILE_SIZE_KB) {
    return {
      valid: false,
      error: `Image too large (${sizeInKB.toFixed(0)}KB). Maximum allowed size is ${MAX_FILE_SIZE_KB}KB.`,
      sizeInKB: Math.round(sizeInKB)
    }
  }

  if (sizeInKB > maxSizeKB) {
    return {
      valid: true,
      warning: `Large image (${sizeInKB.toFixed(0)}KB). Upload may be slow.`
    }
  }

  return { valid: true }
}

/**
 * Fetch an image from a URL and convert it to a File object
 * Handles CORS, timeouts, and invalid responses
 * Validates file size, MIME type, and content using magic bytes
 *
 * @param {string} url - Image URL to fetch
 * @param {string} filename - Base filename (without extension)
 * @returns {Promise<Object>} Result object with {success, file?, error?, warning?, sizeInKB?}
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

    // Step 1: Validate MIME type from header
    const contentType = response.headers.get('content-type')
    const mimeValidation = validateMimeType(contentType)
    if (!mimeValidation.valid) {
      logger.warn('[ImageFetcher] Invalid MIME type:', contentType)
      return createErrorResult(mimeValidation.error)
    }

    const normalizedMimeType = mimeValidation.mimeType

    // Step 2: Get file content
    const blob = await response.blob()

    // Step 3: Validate file size BEFORE magic byte check
    const sizeInKB = blob.size / BYTES_PER_KB
    if (sizeInKB > MAX_FILE_SIZE_KB) {
      logger.warn('[ImageFetcher] File too large:', {
        sizeKB: Math.round(sizeInKB),
        maxKB: MAX_FILE_SIZE_KB
      })
      return {
        success: false,
        error: `Image too large (${Math.round(sizeInKB)}KB). Maximum allowed size is ${MAX_FILE_SIZE_KB}KB.`,
        sizeInKB: Math.round(sizeInKB),
        useFallback: true // Signal to use cover_url instead
      }
    }

    // Step 4: Validate magic bytes
    const arrayBuffer = await blob.arrayBuffer()
    const magicValidation = await validateImageMagicBytes(arrayBuffer, normalizedMimeType)
    if (!magicValidation.valid) {
      logger.error('[ImageFetcher] Magic byte validation failed')
      return createErrorResult(magicValidation.error)
    }

    // Step 5: Create sanitized file
    const extension = getImageExtension(url, normalizedMimeType)
    const sanitizedFilename = `${filename}.${extension}`.replace(/[^a-zA-Z0-9._-]/g, '_')
    const file = new File([blob], sanitizedFilename, { type: normalizedMimeType })

    logger.info('[ImageFetcher] Validated and fetched:', {
      size: `${Math.round(sizeInKB)}KB`,
      type: file.type,
      filename: sanitizedFilename
    })

    // Check for size warning
    const sizeValidation = validateFileSize(file)

    return createSuccessResult(file, sizeValidation.warning)

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
