#!/usr/bin/env bash
set -euo pipefail

AGENT="${AGENT:-human}"                     # set per terminal / agent
ROOT="$(git rev-parse --show-toplevel)"
CHANGED=$(git diff --cached --name-only)

# ---- LOC cap (≤300 changed LOC) --------------------------------------------
LOC=$(git diff --cached --numstat | awk '{add+=$1;del+=$2} END{print add+del}')
if [ "${LOC:-0}" -gt 300 ]; then
  echo "❌ Commit exceeds LOC cap (<=300). Changed: $LOC"
  exit 1
fi

# ---- scopes ----------------------------------------------------------------
allow_any="\.md$|^\.kiro/|^docs/|^\.husky/|^scripts/|^\.github/"
case "$AGENT" in
  architecture)
    allow="^docs/arch/|^contracts/|^gateway/|^tests/contract/|^migration/plan-.*\.md$|${allow_any}"
    deny="^backend-implementation/src/"
    ;;
  db_architect)
    allow="^backend-implementation/db/schema\.dev\.sql$|^docker-compose\.dev\.yml$|^scripts/seed-dev\.js$|^\.env\.dev$|^backend-implementation/package\.json$|${allow_any}"
    deny="^contracts/|^backend-implementation/src/"
    ;;
  external_api)
    allow="^backend-implementation/src/(controllers|routes|middleware|shared|types|clients)/|${allow_any}"
    deny="^contracts/|^backend-implementation/db/"
    ;;
  ingestion)
    allow="^backend-implementation/src/(controllers/ingest|services/ingest)/|${allow_any}"
    deny="^contracts/|^backend-implementation/db/"
    ;;
  orders)
    allow="^backend-implementation/src/(controllers/orders|services/orders)/|${allow_any}"
    deny="^contracts/|^backend-implementation/db/"
    ;;
  eventing_obs)
    allow="^backend-implementation/src/(eventing|infra|obs)/|^backend-implementation/src/routes/health\.ts$|${allow_any}"
    deny="^contracts/"
    ;;
  *)
    allow=".*" ; deny=""
    ;;
esac

# deny block
if [ -n "$deny" ] && echo "$CHANGED" | grep -E "$deny" >/dev/null; then
  echo "❌ $AGENT attempted to modify forbidden paths:"
  echo "$CHANGED" | grep -E "$deny"
  exit 1
fi

# allow block
if [ -n "$allow" ]; then
  disallowed=$(echo "$CHANGED" | grep -Ev "$allow" || true)
  if [ -n "$disallowed" ]; then
    echo "❌ $AGENT changed files outside allowed scope:"
    echo "$disallowed"
    exit 1
  fi
fi

echo "✅ policy ok for $AGENT (LOC=$LOC)"