/// <reference path="../pb_data/types.d.ts" />

// Trusted-header authentication for deployments that sit behind a reverse
// proxy handling SSO/login. When enabled, PocketBase no longer authenticates
// requests via password/token — every request must carry the configured
// username header (and, if set, a matching shared-secret header), and is
// resolved to a `users` record (auto-created on first sight).
//
// Note: routerUse/routerAdd handlers are compiled standalone by the JSVM and
// do not close over top-level variables, so config is read via $os.getenv()
// fresh inside each handler rather than cached in outer consts.
if ($os.getenv("REMOTE_USER_ENABLED") === "true") {
  routerUse((e) => {
    const secret = $os.getenv("REMOTE_USER_SECRET")
    if (secret && e.request.header.get($os.getenv("REMOTE_USER_SECRET_HEADER")) !== secret) {
      throw new UnauthorizedError("Missing or invalid remote-auth secret header")
    }

    const username = e.request.header.get($os.getenv("REMOTE_USER_HEADER"))
    if (!username) {
      throw new UnauthorizedError("Missing remote user header")
    }

    const usersCollection = $app.findCollectionByNameOrId("users")

    let user
    try {
      user = $app.findFirstRecordByFilter(usersCollection, "username = {:username}", { username })
    } catch {
      user = new Record(usersCollection, { username })
      user.setRandomPassword()
      user.setVerified(true)
      try {
        $app.save(user)
      } catch {
        // Lost a create race to a concurrent request for the same new
        // username — the other request's record now exists, use it.
        user = $app.findFirstRecordByFilter(usersCollection, "username = {:username}", { username })
      }
    }

    e.auth = user

    return e.next()
  })

  // Lets the frontend exchange the proxy-trusted header for a normal
  // PocketBase auth token, so the rest of the app (and PocketBase JS SDK)
  // can work exactly as it would after a real login. Absence of this route
  // (404) is how the frontend detects that remote-user auth is disabled.
  routerAdd("GET", "/api/remote-user/session", (e) => {
    return e.json(200, {
      token: e.auth.newAuthToken(),
      record: e.auth
    })
  })
}
