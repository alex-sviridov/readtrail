#!/bin/sh
set -e

/pb/pocketbase serve --http=127.0.0.1:8090 &
PB_PID=$!

nginx -g 'daemon off;' &
NGINX_PID=$!

trap 'kill -TERM "$PB_PID" "$NGINX_PID" 2>/dev/null' TERM INT

wait -n
