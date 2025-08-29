#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Repository Audit Report"
echo "=========================="

# Current agent
echo "Agent: ${AGENT:-human}"

# Changed files vs scope
if git diff --cached --name-only &>/dev/null; then
  CHANGED=$(git diff --cached --name-only)
  if [ -n "$CHANGED" ]; then
    echo "📝 Staged Changes:"
    echo "$CHANGED" | sed 's/^/  /'
    
    # LOC count
    LOC=$(git diff --cached --numstat | awk '{add+=$1;del+=$2} END{print add+del}')
    echo "📊 LOC: ${LOC:-0}/300"
  else
    echo "📝 No staged changes"
  fi
else
  echo "📝 No git repository or staged changes"
fi

# Hook readiness
echo "🔧 Hook Status:"
if [ -x ".git/hooks/pre-commit" ]; then
  echo "  ✅ pre-commit hook active"
else
  echo "  ❌ pre-commit hook missing"
fi

if [ -x ".git/hooks/pre-push" ]; then
  echo "  ✅ pre-push hook active"
else
  echo "  ❌ pre-push hook missing"
fi

# Policy script
if [ -x "scripts/policy-enforce.sh" ]; then
  echo "  ✅ policy-enforce.sh executable"
else
  echo "  ❌ policy-enforce.sh not executable"
fi

echo "=========================="