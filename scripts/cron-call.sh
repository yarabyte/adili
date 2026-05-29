#!/usr/bin/env bash
# Appelle une route /api/cron/* avec CRON_SECRET (à planifier via crontab).
# Usage : ./scripts/cron-call.sh /api/cron/expire-packs
set -euo pipefail

ENDPOINT="${1:?Usage: cron-call.sh <path> e.g. /api/cron/reset-quotas}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

: "${CRON_SECRET:?CRON_SECRET manquant (définir dans .env)}"
: "${NEXT_PUBLIC_SITE_URL:?NEXT_PUBLIC_SITE_URL manquant (définir dans .env)}"

URL="${NEXT_PUBLIC_SITE_URL%/}${ENDPOINT}"
curl -fsS --max-time 120 \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "$URL"
echo ""
