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
