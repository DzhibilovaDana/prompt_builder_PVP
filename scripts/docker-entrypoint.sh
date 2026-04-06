#!/bin/sh
set -eu

if [ -n "${DATABASE_URL:-}" ]; then
  echo "Initializing database schema..."
  attempts=0
  until npm run db:init >/tmp/db-init.log 2>&1; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge 30 ]; then
      echo "Database initialization failed after ${attempts} attempts."
      cat /tmp/db-init.log
      exit 1
    fi
    echo "Database not ready yet, retry ${attempts}/30..."
    sleep 2
  done
  cat /tmp/db-init.log
fi

exec "$@"
