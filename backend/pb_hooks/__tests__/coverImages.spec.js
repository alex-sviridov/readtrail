import { describe, it, expect } from 'vitest'
import { checkUrlAllowed, validateImageBytes, MAX_IMAGE_SIZE_BYTES } from '../coverImages.js'

describe('checkUrlAllowed', () => {
  it('allows a normal https URL', () => {
    expect(checkUrlAllowed('https://covers.openlibrary.org/b/id/1-M.jpg')).toEqual({ allowed: true })
  })

  it('allows a normal http URL', () => {
    expect(checkUrlAllowed('http://example.com/cover.jpg')).toEqual({ allowed: true })
  })

  it('rejects a non-http(s) scheme', () => {
    expect(checkUrlAllowed('ftp://example.com/cover.jpg')).toEqual({
      allowed: false,
      reason: 'unsupported scheme'
    })
  })

  it('rejects an unparseable URL', () => {
    expect(checkUrlAllowed('not a url')).toEqual({ allowed: false, reason: 'unparseable url' })
  })

  it('rejects loopback IPv4', () => {
    expect(checkUrlAllowed('http://127.0.0.1/x.jpg')).toEqual({ allowed: false, reason: 'disallowed host' })
  })

  it('rejects 10.0.0.0/8 private IPv4', () => {
    expect(checkUrlAllowed('http://10.1.2.3/x.jpg').allowed).toBe(false)
  })

  it('rejects 172.16.0.0/12 private IPv4', () => {
    expect(checkUrlAllowed('http://172.16.5.5/x.jpg').allowed).toBe(false)
    expect(checkUrlAllowed('http://172.31.0.1/x.jpg').allowed).toBe(false)
    expect(checkUrlAllowed('http://172.32.0.1/x.jpg').allowed).toBe(true)
  })

  it('rejects 192.168.0.0/16 private IPv4', () => {
    expect(checkUrlAllowed('http://192.168.1.1/x.jpg').allowed).toBe(false)
  })

  it('rejects link-local 169.254.0.0/16', () => {
    expect(checkUrlAllowed('http://169.254.169.254/latest/meta-data').allowed).toBe(false)
  })

  it('rejects localhost and .local/.internal hostnames', () => {
    expect(checkUrlAllowed('http://localhost/x.jpg').allowed).toBe(false)
    expect(checkUrlAllowed('http://LOCALHOST/x.jpg').allowed).toBe(false)
    expect(checkUrlAllowed('http://myhost.local/x.jpg').allowed).toBe(false)
    expect(checkUrlAllowed('http://api.internal/x.jpg').allowed).toBe(false)
  })

  it('rejects IPv6 loopback and link-local', () => {
    expect(checkUrlAllowed('http://[::1]/x.jpg').allowed).toBe(false)
    expect(checkUrlAllowed('http://[fe80::1]/x.jpg').allowed).toBe(false)
    expect(checkUrlAllowed('http://[fc00::1]/x.jpg').allowed).toBe(false)
  })

  it('allows a normal public hostname that merely contains digits', () => {
    expect(checkUrlAllowed('https://img101.example.com/x.jpg').allowed).toBe(true)
  })
})

const PNG_HEADER = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]
const JPEG_HEADER = [0xFF, 0xD8, 0xFF]

function bytesOf(header, totalLength = header.length) {
  const bytes = new Array(totalLength).fill(0)
  header.forEach((b, i) => { bytes[i] = b })
  return bytes
}

describe('validateImageBytes', () => {
  it('accepts a valid PNG', () => {
    const result = validateImageBytes(bytesOf(PNG_HEADER, 100))
    expect(result).toEqual({ valid: true, mimeType: 'image/png' })
  })

  it('accepts a valid JPEG', () => {
    const result = validateImageBytes(bytesOf(JPEG_HEADER, 100))
    expect(result).toEqual({ valid: true, mimeType: 'image/jpeg' })
  })

  it('rejects bytes over the size cap', () => {
    const result = validateImageBytes(bytesOf(PNG_HEADER, MAX_IMAGE_SIZE_BYTES + 1))
    expect(result).toEqual({
      valid: false,
      code: 'cover_too_large',
      error: 'Image is too large (max 512KB).'
    })
  })

  it('rejects bytes matching no known image signature', () => {
    const result = validateImageBytes(bytesOf([0x00, 0x01, 0x02, 0x03], 20))
    expect(result).toEqual({
      valid: false,
      code: 'cover_invalid_format',
      error: "That doesn't look like a supported image (JPEG, PNG, GIF, WebP, BMP)."
    })
  })

  it('rejects an empty byte array', () => {
    expect(validateImageBytes([]).valid).toBe(false)
  })
})
