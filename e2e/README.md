# End-to-end tests

Playwright tests that run against the real `all-in-one` container (built
from `infrastructure/all-in-one/Containerfile`) — the same image used in
production, with a self-signed cert and a fresh PocketBase database each
run.

## Running

From the project root:

```bash
make test-e2e
```

Or from this directory:

```bash
./run-e2e.sh
```

This builds and starts the `all-in-one` container (ports `18080`/`18443`,
chosen to avoid colliding with other local services on `8080`/`8443`),
waits for it to become healthy, runs the Playwright suite against it, and
tears the container down afterwards — pass or fail.

Requires Docker and Node (the first run installs Playwright's browsers via
`npm install` in this directory; run `npx playwright install` manually if
prompted).

## Running against an already-running stack

If you already have the app running (e.g. via `make dev` at the project
root), you can skip the container build and run Playwright directly:

```bash
npm run test:e2e
```

This defaults to `https://localhost:18443`; override with `BASE_URL` to
point at a different instance, e.g.:

```bash
BASE_URL=http://localhost:8080 npm run test:e2e
```

## Adding tests

Each spec file assumes a fresh, unique user per test (see
`tests/helpers/testUser.js`) so tests can run in parallel and against a
shared, persistent backend without colliding. `tests/helpers/books.js`
mocks the OpenLibrary search API so book-related tests don't depend on
that third-party service's uptime or content.
