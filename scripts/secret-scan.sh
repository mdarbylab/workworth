#!/usr/bin/env bash
# Basic secret scan over tracked files: common credential shapes only. It is a floor, not a
# substitute for a dedicated scanner; replace or extend it as the project grows.
# From the firm's project template (handbook quality-gates.md), plus the Stripe and Supabase
# shapes this project actually uses.
set -euo pipefail
cd "$(dirname "$0")/.."

pattern='AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|xox[baprs]-[A-Za-z0-9-]{10,}|[sr]k_(live|test)_[A-Za-z0-9]{16,}|whsec_[A-Za-z0-9]{16,}|sb_secret_[A-Za-z0-9_-]{16,}|sbp_[A-Za-z0-9]{30,}|re_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}|phx_[A-Za-z0-9]{30,}|AIza[0-9A-Za-z_-]{35}'
if git grep -nIE "$pattern" -- . ':!package-lock.json' >/dev/null; then
  echo "possible secret found in:" >&2
  git grep -lIE "$pattern" -- . ':!package-lock.json' >&2
  exit 1
fi
echo "no secrets found"
