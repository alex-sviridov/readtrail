import { describe, it, expect } from 'vitest'
import { checkUrlAllowed } from '../coverImages.js'

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
