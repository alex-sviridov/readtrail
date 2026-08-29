#!/bin/sh
set -e

# Ensure pb_data directory has correct permissions
chmod 777 /pb/pb_data

/pb/pocketbase serve --http=127.0.0.1:8090 &
PB_PID=$!

trap 'kill -TERM "$PB_PID" 2>/dev/null' TERM INT

exec nginx -g 'daemon off;'
