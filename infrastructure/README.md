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

## Auto-update

The frontend and backend containers have `AutoUpdate=registry` enabled. To update to the latest images:

```bash
podman auto-update
systemctl --user restart readtrail-frontend.service
systemctl --user restart readtrail-backend.service
systemctl --user restart readtrail-nginx.service
```

Or set up a systemd timer for automatic updates.