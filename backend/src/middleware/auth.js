import { ensureGuestUser, migrateGuestData } from '../db-memory.js';

export function authMiddleware(req, res, next) {
  const authEnabled = process.env.AUTH_ENABLE === 'true';
  const guestEnabled = process.env.AUTH_GUEST_USER_ENABLE === 'true';
  const headerName = process.env.AUTH_REMOTE_HTTP_HEADER || 'X-Auth-User';

  if (!authEnabled) {
    // No authentication mode - use default user
    req.userId = 'default';
    return next();
  }

  const authHeader = req.get(headerName);

  if (!authHeader || authHeader.trim() === '') {
    // No auth header provided
    if (guestEnabled) {
      // Guest mode - use guest user
      req.userId = ensureGuestUser();
      return next();
    } else {
      // Auth required
      return res.status(401).json({
        error: 'AuthenticationError',
        message: 'Authentication required. Please provide authentication header.'
      });
    }
  }

  // Auth header provided
  const userIdentifier = authHeader.trim();

  if (userIdentifier === '') {
    return res.status(403).json({
      error: 'AuthenticationError',
      message: 'Invalid authentication header value.'
    });
  }

  // If guest mode is enabled and user was using guest, migrate data
  if (guestEnabled) {
    migrateGuestData(userIdentifier);
  }

  req.userId = userIdentifier;
  next();
}

export function optionalAuth(req, res, next) {
  // For endpoints that don't require auth (like health check)
  next();
}
