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

module.exports = { checkUrlAllowed }
