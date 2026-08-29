# Deploy Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the podman-quadlet prod/stage deploy with (1) k8s manifests for the maintainer's own hosting and (2) a new all-in-one container image for simple self-hosting, and drop the `stage` git branch in favor of plain GitHub flow.

**Architecture:** Three independently-built container images already exist or will exist (`frontend`, `backend` unchanged; new `all-in-one` bundles both behind one nginx). K8s manifests consume the existing `frontend`/`backend` images as-is. All podman quadlets, the prod docker-compose file, and the podman-era nginx configs are deleted. The `stage` branch and its GitHub ruleset entry are removed.

**Tech Stack:** Docker/Containerfile multi-stage builds, nginx (unprivileged), PocketBase, plain Kubernetes YAML manifests (no Helm/Kustomize), GitHub Actions, GitHub CLI (`gh`).

**Spec:** `docs/superpowers/specs/2026-08-29-deploy-restructure-design.md`

## Global Constraints

- All-in-one image runs as the non-root `nginx` user throughout; no added Linux capabilities. Listens on unprivileged ports `8080` (HTTP, redirects) and `8443` (HTTPS) — operators map to host `80`/`443` via standard Docker port publishing.
- All-in-one image build context is the **repo root** (needs both `frontend/` and `backend/` source): `docker build -f infrastructure/all-in-one/Containerfile .`
- PocketBase inside the all-in-one image listens on `127.0.0.1:8090` only (loopback), never exposed directly.
- k8s manifests use the existing `frontend`/`backend` images unchanged, `ghcr.io/alex-sviridov/readtrail/{frontend,backend}:latest`.
- Backend is single-replica only (`replicas: 1`, `strategy: Recreate`) — PocketBase uses local SQLite, not horizontally scalable.
- No cert-manager dependency baked in — TLS secret (k8s Ingress) or cert files (all-in-one volume mount) are operator-provided; cert-manager is an optional, commented-out annotation.
- `infrastructure/compose-dev.yaml` and `infrastructure/nginx/dev.conf` are out of scope — do not modify.
- Env var names for backend config (`SUPERUSER_EMAIL`, `SUPERUSER_PASSWORD`, `REMOTE_USER_ENABLED`, `REMOTE_USER_HEADER`, `REMOTE_USER_SECRET_HEADER`, `REMOTE_USER_SECRET`) come verbatim from `backend/.env.example` — do not rename.

---

## Task 1: All-in-one Containerfile, nginx.conf, entrypoint.sh

**Files:**
- Create: `infrastructure/all-in-one/Containerfile`
- Create: `infrastructure/all-in-one/nginx.conf`
- Create: `infrastructure/all-in-one/entrypoint.sh`

**Interfaces:**
- Consumes: `frontend/package.json`, `frontend/package-lock.json`, `frontend/` source (build stage); `backend/pb_migrations/`, `backend/pb_hooks/` (copied in as-is).
- Produces: a runnable image exposing container ports `8080` (HTTP) and `8443` (HTTPS), volume mount point `/pb/pb_data`, reading env vars `SUPERUSER_EMAIL`, `SUPERUSER_PASSWORD`, `REMOTE_USER_ENABLED`, `REMOTE_USER_HEADER`, `REMOTE_USER_SECRET_HEADER`, `REMOTE_USER_SECRET`.

- [ ] **Step 1: Write `infrastructure/all-in-one/entrypoint.sh`**

```sh
#!/bin/sh
set -e

/pb/pocketbase serve --http=127.0.0.1:8090 &
PB_PID=$!

trap 'kill -TERM "$PB_PID" 2>/dev/null' TERM INT

exec nginx -g 'daemon off;'
```

- [ ] **Step 2: Write `infrastructure/all-in-one/nginx.conf`**

```nginx
worker_processes auto;
pid /tmp/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    charset       utf-8;

    access_log    off;
    error_log     /dev/stderr warn;

    sendfile        on;
    tcp_nopush      on;
    tcp_nodelay     on;
    keepalive_timeout  65;
    keepalive_requests 1000;

    gzip on;
    gzip_comp_level 6;
    gzip_proxied any;
    gzip_min_length 256;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    server {
        listen 8080;
        server_name _;

        location / {
            return 301 https://$host:8443$request_uri;
        }
    }

    server {
        listen 8443 ssl;
        http2 on;
        server_name _;

        ssl_certificate     /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        root   /usr/share/nginx/html;
        index  index.html;

        location /api/ {
            proxy_set_header Connection '';
            proxy_http_version 1.1;
            proxy_read_timeout 360s;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_pass http://127.0.0.1:8090;
        }

        location / {
            try_files $uri $uri/ /index.html;
        }

        location ~ ^/(?!api/).*\.(?:ico|css|js|gif|jpe?g|png|woff2?|eot|ttf|svg|map)$ {
            expires 1y;
            access_log off;
            add_header Cache-Control "public, immutable";
            add_header X-Content-Type-Options nosniff;
        }

        location /assets/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header X-Content-Type-Options nosniff;
        }

        error_page 404 /index.html;
    }
}
```

- [ ] **Step 3: Write `infrastructure/all-in-one/Containerfile`**

```dockerfile
ARG NODE_VERSION=23.11.0-alpine
ARG NGINX_VERSION=alpine3.22
ARG PB_VERSION=0.35.0

# =========================================
# Stage 1: Build the Vue.js Application
# =========================================
FROM node:${NODE_VERSION} AS builder

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./

RUN --mount=type=cache,target=/root/.npm npm ci

COPY frontend/ .

RUN npm run build

# =========================================
# Stage 2: Bundle PocketBase + built frontend behind nginx
# =========================================
FROM nginxinc/nginx-unprivileged:${NGINX_VERSION} AS runner

ARG PB_VERSION

RUN apk add --no-cache unzip ca-certificates

ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/ && rm /tmp/pb.zip

COPY backend/pb_migrations /pb/pb_migrations
COPY backend/pb_hooks /pb/pb_hooks

COPY infrastructure/all-in-one/nginx.conf /etc/nginx/nginx.conf
COPY infrastructure/all-in-one/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh /pb/pocketbase && chown -R nginx:nginx /pb

USER nginx

COPY --chown=nginx:nginx --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080 8443

ENTRYPOINT ["/entrypoint.sh"]
```

- [ ] **Step 4: Build the image**

Run: `docker build -f infrastructure/all-in-one/Containerfile -t readtrail-all-in-one:test .` (from repo root)
Expected: build succeeds, final step is `EXPORTING` the image (no errors from either stage).

- [ ] **Step 5: Generate a throwaway self-signed cert for the smoke test**

Run:
```bash
mkdir -p /tmp/readtrail-aio-ssl
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout /tmp/readtrail-aio-ssl/key.pem \
  -out /tmp/readtrail-aio-ssl/cert.pem \
  -days 1 -subj "/CN=localhost"
```
Expected: `cert.pem` and `key.pem` created in `/tmp/readtrail-aio-ssl`.

- [ ] **Step 6: Run the container and smoke-test it**

Run:
```bash
docker run -d --name readtrail-aio-test \
  -p 18080:8080 -p 18443:8443 \
  -v /tmp/readtrail-aio-ssl:/etc/nginx/ssl:ro \
  -v readtrail-aio-test-data:/pb/pb_data \
  readtrail-all-in-one:test
sleep 3
curl -sk -o /dev/null -w "%{http_code}\n" https://localhost:18443/
curl -sk -o /dev/null -w "%{http_code}\n" https://localhost:18443/api/health
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:18080/
```
Expected: first curl (`/`) returns `200`, second (`/api/health`) returns `200`, third (plain HTTP) returns `301`.

- [ ] **Step 7: Clean up the smoke-test container**

Run:
```bash
docker rm -f readtrail-aio-test
docker volume rm readtrail-aio-test-data
rm -rf /tmp/readtrail-aio-ssl
```
Expected: container, volume, and temp cert dir removed with no errors.

- [ ] **Step 8: Commit**

```bash
git add infrastructure/all-in-one/
git commit -m "Add all-in-one Containerfile bundling frontend + PocketBase behind nginx"
```

---

## Task 2: Kubernetes manifests

**Files:**
- Create: `infrastructure/k8s/frontend-deployment.yaml`
- Create: `infrastructure/k8s/frontend-service.yaml`
- Create: `infrastructure/k8s/backend-pvc.yaml`
- Create: `infrastructure/k8s/backend-deployment.yaml`
- Create: `infrastructure/k8s/backend-service.yaml`
- Create: `infrastructure/k8s/ingress.yaml`

**Interfaces:**
- Consumes: existing images `ghcr.io/alex-sviridov/readtrail/frontend:latest` (port 8080) and `ghcr.io/alex-sviridov/readtrail/backend:latest` (port 8090); a `Secret` named `readtrail-backend-secrets` (not created by these manifests — operator creates it, documented in Task 3); a TLS `Secret` named `readtrail-tls` (operator-provided).
- Produces: Services `readtrail-frontend` (port 8080) and `readtrail-backend` (port 8090) that `ingress.yaml` routes to.

- [ ] **Step 1: Write `infrastructure/k8s/frontend-deployment.yaml`**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: readtrail-frontend
  labels:
    app: readtrail-frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: readtrail-frontend
  template:
    metadata:
      labels:
        app: readtrail-frontend
    spec:
      containers:
        - name: frontend
          image: ghcr.io/alex-sviridov/readtrail/frontend:latest
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet:
              path: /
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 20
```

- [ ] **Step 2: Write `infrastructure/k8s/frontend-service.yaml`**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: readtrail-frontend
spec:
  selector:
    app: readtrail-frontend
  ports:
    - port: 8080
      targetPort: 8080
```

- [ ] **Step 3: Write `infrastructure/k8s/backend-pvc.yaml`**

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: readtrail-backend-data
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
```

- [ ] **Step 4: Write `infrastructure/k8s/backend-deployment.yaml`**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: readtrail-backend
  labels:
    app: readtrail-backend
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: readtrail-backend
  template:
    metadata:
      labels:
        app: readtrail-backend
    spec:
      containers:
        - name: backend
          image: ghcr.io/alex-sviridov/readtrail/backend:latest
          ports:
            - containerPort: 8090
          env:
            - name: SUPERUSER_EMAIL
              valueFrom:
                secretKeyRef:
                  name: readtrail-backend-secrets
                  key: SUPERUSER_EMAIL
                  optional: true
            - name: SUPERUSER_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: readtrail-backend-secrets
                  key: SUPERUSER_PASSWORD
                  optional: true
            - name: REMOTE_USER_ENABLED
              valueFrom:
                secretKeyRef:
                  name: readtrail-backend-secrets
                  key: REMOTE_USER_ENABLED
                  optional: true
            - name: REMOTE_USER_HEADER
              valueFrom:
                secretKeyRef:
                  name: readtrail-backend-secrets
                  key: REMOTE_USER_HEADER
                  optional: true
            - name: REMOTE_USER_SECRET_HEADER
              valueFrom:
                secretKeyRef:
                  name: readtrail-backend-secrets
                  key: REMOTE_USER_SECRET_HEADER
                  optional: true
            - name: REMOTE_USER_SECRET
              valueFrom:
                secretKeyRef:
                  name: readtrail-backend-secrets
                  key: REMOTE_USER_SECRET
                  optional: true
          volumeMounts:
            - name: pb-data
              mountPath: /pb/pb_data
          readinessProbe:
            httpGet:
              path: /api/health
              port: 8090
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /api/health
              port: 8090
            initialDelaySeconds: 10
            periodSeconds: 20
      volumes:
        - name: pb-data
          persistentVolumeClaim:
            claimName: readtrail-backend-data
```

- [ ] **Step 5: Write `infrastructure/k8s/backend-service.yaml`**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: readtrail-backend
spec:
  selector:
    app: readtrail-backend
  ports:
    - port: 8090
      targetPort: 8090
```

- [ ] **Step 6: Write `infrastructure/k8s/ingress.yaml`**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: readtrail
  annotations:
    # If using cert-manager for automatic TLS certs, uncomment and set your issuer:
    # cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - readtrail.example.com
      secretName: readtrail-tls
  rules:
    - host: readtrail.example.com
      http:
        paths:
          - path: /api/
            pathType: Prefix
            backend:
              service:
                name: readtrail-backend
                port:
                  number: 8090
          - path: /
            pathType: Prefix
            backend:
              service:
                name: readtrail-frontend
                port:
                  number: 8080
```

- [ ] **Step 7: Validate the manifests**

Run: `kubectl apply --dry-run=client -f infrastructure/k8s/`
Expected: six lines, one per resource, each ending in `(dry run)` with no errors, e.g.:
```
deployment.apps/readtrail-frontend created (dry run)
service/readtrail-frontend created (dry run)
persistentvolumeclaim/readtrail-backend-data created (dry run)
deployment.apps/readtrail-backend created (dry run)
service/readtrail-backend created (dry run)
ingress.networking.k8s.io/readtrail created (dry run)
```

- [ ] **Step 8: Commit**

```bash
git add infrastructure/k8s/
git commit -m "Add k8s manifests for frontend/backend hosting"
```

---

## Task 3: Rewrite `infrastructure/README.md`

**Files:**
- Modify: `infrastructure/README.md` (full rewrite)

**Interfaces:**
- Consumes: env var names and semantics from `backend/.env.example` (`SUPERUSER_EMAIL`, `SUPERUSER_PASSWORD`, `REMOTE_USER_ENABLED`, `REMOTE_USER_HEADER`, `REMOTE_USER_SECRET_HEADER`, `REMOTE_USER_SECRET`); image names `ghcr.io/alex-sviridov/readtrail/{all-in-one,frontend,backend}`; manifest paths from Task 2 (`infrastructure/k8s/`).
- Produces: nothing consumed by other tasks — documentation only.

- [ ] **Step 1: Replace the file contents**

```markdown
# Deploying ReadTrail

Two supported ways to run ReadTrail in production: a single self-contained
container, or Kubernetes.

## Option 1: Self-hosting with the all-in-one image

The `all-in-one` image (`ghcr.io/alex-sviridov/readtrail/all-in-one`) bundles
the built frontend and PocketBase behind one nginx, in a single container.
It runs as a non-root user and listens on unprivileged ports `8080` (HTTP,
redirects to HTTPS) and `8443` (HTTPS) — map these to your host's standard
ports with normal Docker port publishing.

```bash
docker run -d --name readtrail \
  -p 80:8080 -p 443:8443 \
  -v readtrail-data:/pb/pb_data \
  -v /path/to/your/ssl:/etc/nginx/ssl:ro \
  -e SUPERUSER_EMAIL=admin@example.com \
  -e SUPERUSER_PASSWORD=change-me \
  ghcr.io/alex-sviridov/readtrail/all-in-one:latest
```

- `/path/to/your/ssl` must contain `cert.pem` and `key.pem`.
- `readtrail-data` persists the PocketBase SQLite database at
  `/pb/pb_data` — back this volume up like any database.
- If PocketBase crashes inside the container, `/api/` starts failing
  until the container is restarted; there's no separate process
  supervisor watching it. Restart the container (`docker restart
  readtrail`) if this happens.

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `SUPERUSER_EMAIL` | — | PocketBase admin account email |
| `SUPERUSER_PASSWORD` | — | PocketBase admin account password |
| `REMOTE_USER_ENABLED` | `false` | Enable trusted-header auth (see below) |
| `REMOTE_USER_HEADER` | `X-Remote-User` | Header carrying the authenticated username |
| `REMOTE_USER_SECRET_HEADER` | `X-Remote-User-Secret` | Header carrying the shared secret |
| `REMOTE_USER_SECRET` | — | Shared secret; without it, anyone who reaches PocketBase directly can impersonate any user |

## Option 2: Hosting on Kubernetes

Manifests live in `infrastructure/k8s/` and deploy the `frontend` and
`backend` images as separate Deployments, fronted by one Ingress.

1. Create the backend secret (all keys optional except what you need):

```bash
kubectl create secret generic readtrail-backend-secrets \
  --from-literal=SUPERUSER_EMAIL=admin@example.com \
  --from-literal=SUPERUSER_PASSWORD=change-me
```

2. Create (or already have) a TLS secret named `readtrail-tls` for the
   Ingress — either provide your own cert, or set up
   [cert-manager](https://cert-manager.io/) and uncomment the
   `cert-manager.io/cluster-issuer` annotation in `ingress.yaml`.

3. Edit `infrastructure/k8s/ingress.yaml` to replace
   `readtrail.example.com` with your actual hostname.

4. Apply the manifests:

```bash
kubectl apply -f infrastructure/k8s/
```

This assumes an `nginx` IngressClass is available in your cluster
(`ingressClassName: nginx` in `ingress.yaml`) — adjust if your cluster
uses a different ingress controller.

The backend Deployment runs a single replica (`strategy: Recreate`) —
PocketBase's SQLite database can't be shared across pods.

## Proxy-based authentication

The backend can trust a username header set by your reverse
proxy/ingress instead of password login (see
`backend/pb_hooks/remoteUserAuth.pb.js`). Enable it via
`REMOTE_USER_ENABLED=true` and the related env vars above. Only enable
this if PocketBase is reachable exclusively through a proxy that sets
(and strips any client-supplied) these headers — for the k8s option,
set them in an Ingress annotation or a proxy in front of it; for the
all-in-one image, PocketBase is already only reachable through the
bundled nginx.
```

- [ ] **Step 2: Commit**

```bash
git add infrastructure/README.md
git commit -m "Rewrite infrastructure README for all-in-one + k8s deploy"
```

---

## Task 4: All-in-one CI workflow

**Files:**
- Create: `.github/workflows/all-in-one-deploy.yml`

**Interfaces:**
- Consumes: `infrastructure/all-in-one/Containerfile` (Task 1), same GHCR push pattern as `.github/workflows/frontend-deploy.yml` and `.github/workflows/backend-deploy.yml`.
- Produces: published image `ghcr.io/alex-sviridov/readtrail/all-in-one`.

- [ ] **Step 1: Write `.github/workflows/all-in-one-deploy.yml`**

```yaml
name: All-in-one Deploy

on:
  push:
    branches: [ main ]
    paths:
      - 'frontend/**'
      - 'backend/**'
      - 'infrastructure/all-in-one/**'
      - '.github/workflows/all-in-one-deploy.yml'

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}/all-in-one

jobs:
  build-and-push:
    name: Build and Push Latest
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v5

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=raw,value=latest
            type=sha

      - name: Build and push Docker image
        uses: docker/build-push-action@v6
        with:
          context: .
          file: ./infrastructure/all-in-one/Containerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

- [ ] **Step 2: Validate the workflow YAML parses**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/all-in-one-deploy.yml'))" && echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/all-in-one-deploy.yml
git commit -m "Add CI workflow to build and push the all-in-one image"
```

---

## Task 5: Remove podman/quadlet and prod-compose artifacts

**Files:**
- Delete: `infrastructure/podman/` (entire directory: `prod/` and `stage/`)
- Delete: `infrastructure/compose.yaml`
- Delete: `infrastructure/nginx/prod.conf`
- Delete: `infrastructure/nginx-stage.conf`
- Delete: `infrastructure/nginx/nginx-stage.conf`

**Interfaces:**
- Consumes: nothing — this is pure removal, no other task depends on these files existing.
- Produces: nothing.

- [ ] **Step 1: Confirm nothing else in the repo references these files**

Run:
```bash
grep -rl "podman\|compose\.yaml\|prod\.conf\|nginx-stage\.conf" \
  --include="*.md" --include="*.yml" --include="*.yaml" \
  --exclude-dir=node_modules --exclude-dir=.git \
  --exclude=infrastructure/README.md .
```
Expected: no output (Task 3 already rewrote `infrastructure/README.md` to stop referencing podman; if this grep finds other hits, inspect and update those files before deleting).

- [ ] **Step 2: Delete the files**

Run:
```bash
git rm -r infrastructure/podman
git rm infrastructure/compose.yaml
git rm infrastructure/nginx/prod.conf
git rm infrastructure/nginx-stage.conf
git rm infrastructure/nginx/nginx-stage.conf
```
Expected: each command reports the removed file(s), no errors.

- [ ] **Step 3: Verify what's left in `infrastructure/`**

Run: `find infrastructure -type f | sort`
Expected:
```
infrastructure/all-in-one/Containerfile
infrastructure/all-in-one/entrypoint.sh
infrastructure/all-in-one/nginx.conf
infrastructure/compose-dev.yaml
infrastructure/k8s/backend-deployment.yaml
infrastructure/k8s/backend-pvc.yaml
infrastructure/k8s/backend-service.yaml
infrastructure/k8s/frontend-deployment.yaml
infrastructure/k8s/frontend-service.yaml
infrastructure/k8s/ingress.yaml
infrastructure/nginx/dev.conf
infrastructure/README.md
```

- [ ] **Step 4: Commit**

```bash
git commit -m "Remove podman quadlets and prod-compose in favor of k8s/all-in-one"
```

---

## Task 6: Drop the `stage` branch and update branch workflow docs

**Files:**
- Modify: `CLAUDE.md` (note: as of this plan's writing, this file has moved to `.claude/CLAUDE.md` — check which path currently exists on `main` before editing and edit that one)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

This task is operational (branch/ruleset deletion via `gh`/`git`), not code — there's no test cycle in the TDD sense, so steps are verification commands instead.

- [ ] **Step 1: Confirm the `stage` branch has nothing unmerged into `main`**

Run: `git fetch origin && git log --oneline origin/main..origin/stage`
Expected: no output. If this shows commits, stop and surface them — those commits would be lost by deleting the branch; they need to be merged into `main` first (out of scope for this task — ask before proceeding).

- [ ] **Step 2: Delete the remote `stage` branch**

Run: `git push origin --delete stage`
Expected: `- [deleted]         stage`

- [ ] **Step 3: Find and update the branch-protection ruleset**

Run: `gh api repos/alex-sviridov/readtrail/rulesets --jq '.[] | select(.name | contains("main"))'`
Expected: JSON for the ruleset protecting `main`/`stage` (as of this plan, id `11574291`, name `protect_main_and_stage_branches`). Note its `id`.

- [ ] **Step 4: Update the ruleset to only cover `main`**

Run (replace `<id>` with the id from Step 3):
```bash
gh api repos/alex-sviridov/readtrail/rulesets/<id> -X PUT \
  -f name="protect_main_branch" \
  -f target="branch" \
  -f enforcement="active" \
  -F 'conditions[ref_name][include][]=refs/heads/main' \
  -F 'conditions[ref_name][exclude][]=' \
  -f 'rules[][type]=non_fast_forward' \
  -F 'rules[][type]=pull_request' \
  -F 'rules[][parameters][required_approving_review_count]=0' \
  -F 'rules[][parameters][allowed_merge_methods][]=merge' \
  -F 'rules[][parameters][allowed_merge_methods][]=squash' \
  -F 'rules[][parameters][allowed_merge_methods][]=rebase'
```
Expected: `200` response with the updated ruleset JSON, `conditions.ref_name.include` containing only `refs/heads/main`.

If the `gh api -X PUT` field-by-field form above is awkward in practice,
equivalently: `gh api repos/alex-sviridov/readtrail/rulesets/<id> --jq . >
/tmp/ruleset.json`, edit `/tmp/ruleset.json` to drop `refs/heads/stage`
from `conditions.ref_name.include` (and optionally rename it), then
`gh api repos/alex-sviridov/readtrail/rulesets/<id> -X PUT --input
/tmp/ruleset.json`.

- [ ] **Step 5: Verify only `main` is protected**

Run: `gh api repos/alex-sviridov/readtrail/rules/branches/main` and `gh api repos/alex-sviridov/readtrail/rules/branches/stage`
Expected: `main` still shows the `non_fast_forward`/`pull_request` rules; `stage` returns `[]` (no rules — branch no longer exists and isn't covered).

- [ ] **Step 6: Update `CLAUDE.md`**

Replace its contents with:

```markdown
# Branch workflow

- `main` is protected on GitHub (no direct or force pushes, PR required, not even bypassable by the repo owner).
- Standard GitHub flow: branch off `main`, open a PR back into `main` when ready.
```

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md
git commit -m "Drop stage branch: update branch-protection ruleset and CLAUDE.md"
```

---

## Self-Review Notes

- **Spec coverage:** all-in-one image (Task 1) ✓, k8s manifests (Task 2) ✓, removals (Task 5) ✓, README rewrite (Task 3) ✓, CI workflow (Task 4) ✓, branch/ruleset drop (Task 6) ✓. Dev workflow correctly left untouched throughout.
- **Placeholder scan:** no TBDs; `readtrail.example.com` and cert-manager issuer name in `ingress.yaml` are intentionally operator-fill-in values, called out as such in the README (Task 3), not left ambiguous.
- **Type/name consistency:** env var names match `backend/.env.example` exactly across Task 2's manifest and Task 3's README table; image ports (8080/8443 all-in-one, 8080 frontend, 8090 backend) are consistent across every task that references them.
