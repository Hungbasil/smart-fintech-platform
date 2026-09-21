#!/bin/sh
set -e

host=${DB_HOST:-postgres}
port=${DB_PORT:-5432}
timeout=${WAIT_FOR_POSTGRES_TIMEOUT:-60}

printf 'Waiting for Postgres at %s:%s ' "$host" "$port"
for i in $(seq 1 "$timeout"); do
  if nc -z "$host" "$port" >/dev/null 2>&1; then
    echo 'OK'
    exec "$@"
  fi
  printf '.'
  sleep 1
done

echo "\nPostgres is not available after ${timeout}s"
exit 1
