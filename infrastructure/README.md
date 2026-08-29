# Podman Quadlet Configuration

This directory contains Podman Quadlet files and static files necessary for running ReadTrail as systemd services.

## Files

- `podman/readtrail-frontend.container` - Frontend service (nginx serving Vue.js app)
- `podman/readtrail-backend.container` - Backend service (PocketBase)
- `podman/readtrail-nginx.container` - Reverse proxy (nginx)
- `podman/readtrail.network` - Shared network for all services

## Installation

### 1. Copy Quadlet files to systemd directory

For user services (rootless):
```bash
mkdir -p ~/.config/containers/systemd
cp podman/* ~/.config/containers/systemd/
```

Copy static files:
```bash
mkdir -p ~/.config/containers/static/readtrail
cp -R ssl ~/.config/containers/static/readtrail/ssl/
cp nginx.conf ~/.config/containers/static/readtrail/nginx.conf
```

### 2. Reload systemd

For user services:
```bash
systemctl --user daemon-reload

### 4. Start services

For user services:
```bash
systemctl --user start readtrail-nginx.service
```

## Proxy-based authentication

The backend can trust a username header set by this nginx proxy instead of
password login (see `backend/pb_hooks/remoteUserAuth.pb.js`). Enable it via
env vars on the backend container:

```
REMOTE_USER_ENABLED=true
REMOTE_USER_HEADER=X-Remote-User
REMOTE_USER_SECRET_HEADER=X-Remote-User-Secret
REMOTE_USER_SECRET=<a-random-shared-secret>
```

In `nginx.conf`, set both headers on the backend `location` block (and make
sure nothing upstream of nginx can set them, e.g. strip them from incoming
requests first):

```nginx
proxy_set_header X-Remote-User       $remote_user_from_your_sso;
proxy_set_header X-Remote-User-Secret <a-random-shared-secret>;
```

`REMOTE_USER_SECRET` is optional but recommended — without it, anyone who can
reach the backend port directly (bypassing nginx) can impersonate any user.

## Auto-update

The frontend and backend containers have `AutoUpdate=registry` enabled. To update to the latest images:

```bash
podman auto-update
systemctl --user restart readtrail-frontend.service
systemctl --user restart readtrail-backend.service
systemctl --user restart readtrail-nginx.service
```

Or set up a systemd timer for automatic updates.