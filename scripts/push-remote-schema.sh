#!/usr/bin/env bash
# Usage:
#   TURSO_DATABASE_URL='libsql://...' TURSO_AUTH_TOKEN='...' ./scripts/push-remote-schema.sh
#
# One-time schema push for a fresh Turso database.
set -euo pipefail

if [[ -z "${TURSO_DATABASE_URL:-}" ]]; then
  echo "error: TURSO_DATABASE_URL is required"
  exit 1
fi
if [[ -z "${TURSO_AUTH_TOKEN:-}" ]]; then
  echo "error: TURSO_AUTH_TOKEN is required"
  exit 1
fi

echo "Pushing schema to: $TURSO_DATABASE_URL"
npx drizzle-kit push
echo "Done."
