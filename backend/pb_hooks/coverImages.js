// backend/pb_hooks/coverImages.js
//
// Pure logic for cover-image caching, kept free of PocketBase's
// $app/$http/$security/routerAdd globals so it can run under a normal JS
// test runner. coverImagesResolve.js (PocketBase-dependent) and
// coverImages.pb.js (routerAdd/hook wiring) require this file.

const PRIVATE_IPV4_RANGES = [
  { start: [10, 0, 0, 0], end: [10, 255, 255, 255] },
  { start: [172, 16, 0, 0], end: [172, 31, 255, 255] },
  { start: [192, 168, 0, 0], end: [192, 168, 255, 255] },
  { start: [127, 0, 0, 0], end: [127, 255, 255, 255] },
  { start: [169, 254, 0, 0], end: [169, 254, 255, 255] },
  { start: [0, 0, 0, 0], end: [0, 255, 255, 255] }
]

function parseUrl(urlString) {
  const match = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/(\[[^\]]+\]|[^/:?#]+)(?::\d+)?/.exec(urlString)
  if (!match) return null

  const scheme = match[1].toLowerCase()
  let hostname = match[2]
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    hostname = hostname.slice(1, -1)
  }

  return { scheme, hostname: hostname.toLowerCase() }
}

function isIPv4(hostname) {
  return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)
}

function isPrivateIPv4(hostname) {
  if (!isIPv4(hostname)) return false

  const octets = hostname.split('.').map(Number)
  if (octets.some((o) => o > 255)) return false

  return PRIVATE_IPV4_RANGES.some(({ start, end }) =>
    octets.every((o, i) => o >= start[i] && o <= end[i])
  )
}

function isDisallowedIPv6(hostname) {
  if (!hostname.includes(':')) return false

  const normalized = hostname.toLowerCase()
  return (
    normalized === '::1' ||
    normalized.startsWith('fe8') || normalized.startsWith('fe9') ||
    normalized.startsWith('fea') || normalized.startsWith('feb') ||
    normalized.startsWith('fc') || normalized.startsWith('fd')
  )
}

function isDisallowedHostname(hostname) {
  return hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')
}

function checkUrlAllowed(urlString) {
  const parsed = parseUrl(urlString)
  if (!parsed) {
    return { allowed: false, reason: 'unparseable url' }
  }

  if (parsed.scheme !== 'http' && parsed.scheme !== 'https') {
    return { allowed: false, reason: 'unsupported scheme' }
  }

  if (
    isPrivateIPv4(parsed.hostname) ||
    isDisallowedIPv6(parsed.hostname) ||
    isDisallowedHostname(parsed.hostname)
  ) {
    return { allowed: false, reason: 'disallowed host' }
  }

  return { allowed: true }
}

const MAX_IMAGE_SIZE_BYTES = 512 * 1024

const IMAGE_MAGIC_BYTES = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]
  ],
  'image/webp': [[0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50]],
  'image/bmp': [[0x42, 0x4D]]
}

function matchesMagicBytes(bytes, signature) {
  if (bytes.length < signature.length) return false

  for (let i = 0; i < signature.length; i++) {
    if (signature[i] !== null && bytes[i] !== signature[i]) return false
  }

  return true
}

function sniffImageMimeType(bytes) {
  for (const [mimeType, signatures] of Object.entries(IMAGE_MAGIC_BYTES)) {
    if (signatures.some((sig) => matchesMagicBytes(bytes, sig))) return mimeType
  }
  return null
}

function validateImageBytes(bytes) {
  if (!bytes || bytes.length === 0 || bytes.length > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      code: 'cover_too_large',
      error: `Image is too large (max ${MAX_IMAGE_SIZE_BYTES / 1024}KB).`
    }
  }

  const mimeType = sniffImageMimeType(bytes)
  if (!mimeType) {
    return {
      valid: false,
      code: 'cover_invalid_format',
      error: "That doesn't look like a supported image (JPEG, PNG, GIF, WebP, BMP)."
    }
  }

  return { valid: true, mimeType }
}

function diffCoverImageChange(oldId, newId) {
  const normalizedOld = oldId || null
  const normalizedNew = newId || null

  if (normalizedOld === normalizedNew) {
    return { toDecrement: null, toIncrement: null }
  }

  return { toDecrement: normalizedOld, toIncrement: normalizedNew }
}

function decideCoverImageResolution({ existingByUrl, existingByHash }) {
  if (existingByUrl) return { action: 'reuse', id: existingByUrl.id }
  if (existingByHash) return { action: 'reuse', id: existingByHash.id }
  return { action: 'create' }
}

module.exports = {
  checkUrlAllowed,
  validateImageBytes,
  MAX_IMAGE_SIZE_BYTES,
  diffCoverImageChange,
  decideCoverImageResolution
}
