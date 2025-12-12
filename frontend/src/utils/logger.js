/**
 * Environment-aware logging utility
 * Logs only appear in development mode (except warnings and errors)
 */

const isDev = import.meta.env.DEV

export const logger = {
  info: (...args) => isDev && console.info('[ReadTrail]', ...args),
  debug: (...args) => isDev && console.debug('[ReadTrail]', ...args),
  warn: (...args) => console.warn('[ReadTrail]', ...args),
  error: (...args) => console.error('[ReadTrail]', ...args)
}
