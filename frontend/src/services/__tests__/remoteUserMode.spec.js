import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  bootstrapRemoteUser,
  isRemoteUserModeActive,
  isRemoteUserModeMisconfigured
} from '../remoteUserMode'
import pb from '../pocketbase'

vi.mock('../pocketbase', () => ({
  default: {
    send: vi.fn(),
    authStore: {
      save: vi.fn()
    }
  }
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn()
  }
}))

describe('remoteUserMode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('activates and saves the auth token when the backend returns a session', async () => {
    const record = { id: 'u1', username: 'alice' }
    pb.send.mockResolvedValue({ token: 'tok', record })

    await bootstrapRemoteUser()

    expect(pb.authStore.save).toHaveBeenCalledWith('tok', record)
    expect(isRemoteUserModeActive()).toBe(true)
    expect(isRemoteUserModeMisconfigured()).toBe(false)
  })

  it('stays inactive when the backend has the feature disabled (404)', async () => {
    pb.send.mockRejectedValue({ status: 404 })

    await bootstrapRemoteUser()

    expect(pb.authStore.save).not.toHaveBeenCalled()
    expect(isRemoteUserModeActive()).toBe(false)
    expect(isRemoteUserModeMisconfigured()).toBe(false)
  })

  it('reports misconfigured only on a 401 (enabled but header missing)', async () => {
    pb.send.mockRejectedValue({ status: 401 })

    await bootstrapRemoteUser()

    expect(pb.authStore.save).not.toHaveBeenCalled()
    expect(isRemoteUserModeActive()).toBe(false)
    expect(isRemoteUserModeMisconfigured()).toBe(true)
  })

  it('fails open to "off" on a network error, so a transient hiccup does not block a normal deployment', async () => {
    pb.send.mockRejectedValue({ status: 0 })

    await bootstrapRemoteUser()

    expect(pb.authStore.save).not.toHaveBeenCalled()
    expect(isRemoteUserModeActive()).toBe(false)
    expect(isRemoteUserModeMisconfigured()).toBe(false)
  })

  it('fails open to "off" on an unexpected server error', async () => {
    pb.send.mockRejectedValue({ status: 500 })

    await bootstrapRemoteUser()

    expect(isRemoteUserModeActive()).toBe(false)
    expect(isRemoteUserModeMisconfigured()).toBe(false)
  })
})
