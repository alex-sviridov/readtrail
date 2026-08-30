# Deploy restructure: k8s + all-in-one image, drop podman/stage

## Context

Prod today is three podman-quadlet-managed containers: a static-nginx
frontend, a PocketBase backend, and a separate TLS-terminating nginx
reverse proxy in front of both (`infrastructure/podman/prod/*`,
`infrastructure/nginx/prod.conf`). Stage mirrors this with its own
quadlet set. There's also an unused `infrastructure/compose.yaml` that
duplicates the prod 3-container topology in docker-compose form.

Going forward there are two real hosting audiences:

1. **The maintainer**, who will host prod on their own k8s cluster.
2. **Self-hosters**, who want the absolute simplest option: one
   container, `docker run`, done.

Podman/quadlets and the separate stage hosting environment serve
neither audience and are being removed. The `stage` git branch is
being dropped in the same move, in favor of plain GitHub flow
(feature branch → PR → `main`).

Dev (`infrastructure/compose-dev.yaml`, `infrastructure/nginx/dev.conf`,
`frontend/Dockerfile.dev`, `backend/Dockerfile.dev`) is unaffected by
any of this and is out of scope.

## Goals

- Prod hosting moves to k8s, using the existing `frontend` and
  `backend` images unchanged.
- A new, additional `all-in-one` image bundles the built Vue app and
  PocketBase into a single container, for self-hosters who don't want
  k8s or multi-container orchestration.
- All podman quadlet files and the podman-oriented prod/stage nginx
  configs are removed.
- `stage` is dropped as both a git branch and a hosting environment.

## Non-goals

- Building a full production-grade k8s setup (HPA, network policies,
  resource limits tuning, cert-manager wiring) — manifests here are a
  minimal, correct starting point the maintainer will tune for their
  cluster.
- Changing anything about how the frontend or backend images are
  built, or the dev workflow.
- Supporting a "stage" tier of any kind, on k8s or otherwise.

## Design

### 1. `infrastructure/all-in-one/` (new)

A third, independently-built image. Not a replacement for the
frontend/backend images — an additional convenience artifact for
`docker run` self-hosting.

- **`Containerfile`** — multi-stage build:
  - Stage 1 (`node:23.11.0-alpine`, matches `frontend/Dockerfile`):
    `npm ci && npm run build` against the `frontend/` source, produces
    `dist/`.
  - Stage 2 (`nginxinc/nginx-unprivileged:alpine3.22`, matches
    `frontend/Dockerfile`'s base): copies `dist/` to
    `/usr/share/nginx/html`, downloads the PocketBase binary the same
    way `backend/Dockerfile` does (same `PB_VERSION` build arg
    default), copies `backend/pb_hooks` and `backend/pb_migrations` to
    `/pb/`, copies in `nginx.conf` and `entrypoint.sh`.
  - Runs as the unprivileged `nginx` user throughout (no root, no
    added Linux capabilities).
  - Build context is the **repo root** (needs both `frontend/` and
    `backend/` source), invoked as
    `docker build -f infrastructure/all-in-one/Containerfile .`

- **`nginx.conf`** — adapted from `frontend/nginx.conf`:
  - `listen 8080;` → 301-redirects to `https://$host:8443$request_uri`
    (mirrors the redirect-to-https pattern in the old `prod.conf`,
    minus the separate-container split).
  - `listen 8443 ssl;` — TLS server, `ssl_certificate`/
    `ssl_certificate_key` read from `/etc/nginx/ssl/cert.pem` and
    `key.pem` (mounted in), same TLS/cipher/security-header block as
    the old `infrastructure/nginx/prod.conf`.
  - `location /` — static file serving with the same
    `try_files`/caching rules as `frontend/nginx.conf`.
  - `location /api/` — `proxy_pass http://127.0.0.1:8090;` (PocketBase
    listens on loopback only, never exposed directly).

- **`entrypoint.sh`**:
  ```sh
  #!/bin/sh
  set -e
  /pb/pocketbase serve --http=127.0.0.1:8090 &
  PB_PID=$!
  trap 'kill -TERM $PB_PID' TERM INT
  exec nginx -g 'daemon off;'
  ```
  PocketBase's own exit isn't separately supervised — if it crashes,
  `/api/` starts failing until the container is restarted. Acceptable
  for a single-node convenience image; flagged in the README.

- Volume: `/pb/pb_data` — same PocketBase data directory as the
  existing `backend` image, so an operator's existing volume/backup
  tooling for that path transfers over unchanged.

- Env vars: same as `backend/.env.example`
  (`SUPERUSER_EMAIL`/`SUPERUSER_PASSWORD`/`REMOTE_USER_*`), passed
  through to the backgrounded `pocketbase serve` process via the
  container's environment (PocketBase reads them directly; no
  translation needed).

- Ports: container exposes `8080` (HTTP, redirects) and `8443` (HTTPS).
  An operator publishes these to the host's standard ports with
  Docker's normal port mapping, e.g.
  `docker run -p 80:8080 -p 443:8443 ...` — no special capabilities or
  root needed. This mapping is documented in the new README.

### 2. `infrastructure/k8s/` (new)

Minimal manifests using the existing `frontend` and `backend` images
as-is:

- **`frontend-deployment.yaml`** / **`frontend-service.yaml`** —
  Deployment running the `frontend` image, ClusterIP Service on the
  image's existing port 8080.
- **`backend-deployment.yaml`** / **`backend-service.yaml`** /
  **`backend-pvc.yaml`** — Deployment running the `backend` image
  (single replica — PocketBase uses a local SQLite file, not
  horizontally scalable), PVC mounted at `/pb/pb_data`, ClusterIP
  Service on port 8090. Env vars
  (`SUPERUSER_EMAIL`/`SUPERUSER_PASSWORD`/`REMOTE_USER_*`) sourced
  from `secretKeyRef` against a `Secret` named
  `readtrail-backend-secrets` — **not committed**; the README
  documents `kubectl create secret generic readtrail-backend-secrets
  --from-literal=...` for each key.
- **`ingress.yaml`** — single Ingress, `ingressClassName: nginx`
  (documented as an assumption — adjust if the target cluster uses a
  different controller), `path: /` → frontend service, `path: /api/`
  → backend service, TLS via a `secretName` the operator provides
  (cert-manager annotation left as a commented-out example, not
  required).

### 3. Removals

- `infrastructure/podman/` (all of `prod/` and `stage/`)
- `infrastructure/compose.yaml`
- `infrastructure/nginx/prod.conf`
- `infrastructure/nginx-stage.conf` and `infrastructure/nginx/nginx-stage.conf`
  (identical duplicate files)
- `infrastructure/README.md` (replaced — see below)

`infrastructure/compose-dev.yaml` and `infrastructure/nginx/dev.conf`
are untouched.

### 4. `infrastructure/README.md` (rewritten)

Replaces the podman-quadlet installation instructions with two
sections:

- **Self-hosting with the all-in-one image**: `docker run` example
  with volume and port-mapping flags, env var list, TLS cert mount
  instructions, and the proxy-based-auth section carried over from
  the current README (still applies — `REMOTE_USER_*` env vars, same
  semantics).
- **Hosting on k8s**: `kubectl apply -f infrastructure/k8s/`,
  Secret-creation step, note about providing/managing the Ingress TLS
  secret.

### 5. CI/CD

- `.github/workflows/frontend-deploy.yml` and `backend-deploy.yml`:
  unchanged (still build/push their respective images on push to
  `main`).
- **`.github/workflows/all-in-one-deploy.yml`** (new): same
  structure as the existing two workflows (checkout, buildx, GHCR
  login, metadata, build-push-action), but:
  - `context: .` (repo root, not `./frontend` or `./backend`)
  - `file: ./infrastructure/all-in-one/Containerfile`
  - triggers on push to `main` when `frontend/**`, `backend/**`, or
    `infrastructure/all-in-one/**` change
  - image name `${{ github.repository }}/all-in-one`

### 6. Branch workflow

- Delete the `stage` branch (`git push origin --delete stage`).
- Update the GitHub ruleset `protect_main_and_stage_branches` (id
  `11574291`) to drop `refs/heads/stage` from its `ref_name.include`
  list, leaving only `refs/heads/main` protected. Optionally rename
  the ruleset to `protect_main_branch` for clarity.
- Rewrite `CLAUDE.md`'s branch-workflow section: plain GitHub flow —
  feature branches PR directly into `main`; `main` is protected
  (PR-only, no force-push).

## Testing

- `all-in-one` image: build locally, `docker run` it with a temp
  volume and self-signed cert, verify `/` serves the app and `/api/`
  round-trips to PocketBase (e.g. `/api/health`).
- `k8s` manifests: validate with `kubectl apply --dry-run=client -f
  infrastructure/k8s/` (no live cluster required for this repo's CI);
  document that live-cluster verification is the maintainer's
  responsibility post-migration.
- No changes to application code, so the existing frontend test suite
  is unaffected and doesn't need re-running for this change.

## Risks / open items

- The `all-in-one` image duplicates the frontend build step already
  present in `frontend/Dockerfile` (no way to reuse that image's build
  stage across a separate Containerfile without Docker's multi-stage
  `--from=<image>` referencing a *built* image, which would require
  building `frontend` first and is unnecessary complexity for this
  scale) — acceptable duplication, flagged for awareness.
- If PocketBase crashes inside the all-in-one container, nginx keeps
  serving a broken `/api/` until the container restarts — documented
  as a known limitation, not fixed by this design (see entrypoint
  notes above).
