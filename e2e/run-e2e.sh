#!/bin/sh
set -e

cd "$(dirname "$0")"

COMPOSE="docker compose -f docker-compose.e2e.yml"

cleanup() {
  $COMPOSE down -v
}
trap cleanup EXIT

$COMPOSE up --build -d

echo "Waiting for all-in-one container to become healthy..."
for i in $(seq 1 60); do
  if curl -ksf https://localhost:18443/ >/dev/null 2>&1; then
    echo "Container is up."
    break
  fi
  if [ "$i" = 60 ]; then
    echo "Timed out waiting for container to start." >&2
    $COMPOSE logs
    exit 1
  fi
  sleep 1
done

npm run test:e2e
