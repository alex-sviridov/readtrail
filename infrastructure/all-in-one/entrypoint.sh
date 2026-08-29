#!/bin/sh
set -e

/pb/pocketbase serve --http=127.0.0.1:8090 &
PB_PID=$!

trap 'kill -TERM "$PB_PID" 2>/dev/null' TERM INT

exec nginx -g 'daemon off;'
