/**
 * Remote-user (trusted-header) auth mode.
 *
 * Detects and tracks whether the backend is running with header-based auth
 * (see backend/pb_hooks/remoteUserAuth.pb.js) enabled. There is no frontend
 * build flag for this — mode is entirely determined by calling the backend
 * once at boot and reading the result.
 */
import pb from './pocketbase'
import { logger } from '@/utils/logger'

const MODE = {
  OFF: 'off',
  ACTIVE: 'active',
  MISCONFIGURED: 'misconfigured'
}

let mode = MODE.OFF

/**
 * Calls the backend's remote-user session endpoint and updates local mode.
 * - 200: auto-login using the returned token, exactly like a normal login.
 * - 401: enabled server-side but the required header was missing — misconfigured.
 * - anything else (404, network error, 500, ...): treated as "off", so a
 *   transient backend hiccup on a normal/guest deployment (where this route
 *   doesn't even exist) doesn't block the whole app from mounting.
 * @returns {Promise<void>}
 */
export async function bootstrapRemoteUser() {
  try {
    const { token, record } = await pb.send('/api/remote-user/session', { method: 'GET' })
    pb.authStore.save(token, record)
    mode = MODE.ACTIVE
  } catch (error) {
    if (error?.status === 401) {
      logger.error('[RemoteUserMode] Auth proxy misconfigured:', error)
      mode = MODE.MISCONFIGURED
    } else {
      mode = MODE.OFF
    }
  }
}

/**
 * @returns {boolean} True if the frontend is auto-authenticated via a trusted proxy header.
 */
export function isRemoteUserModeActive() {
  return mode === MODE.ACTIVE
}

/**
 * @returns {boolean} True if remote-user auth is enabled server-side but this request lacked the required header.
 */
export function isRemoteUserModeMisconfigured() {
  return mode === MODE.MISCONFIGURED
}
