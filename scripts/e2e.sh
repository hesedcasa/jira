#!/usr/bin/env bash
# Runs the end-to-end suite against the live Jira sandbox.
#
# Nothing in this repo loads .env, so export the credentials first:
#
#   set -a; . ./.env; set +a
#   npm run test:e2e
#   npm run test:e2e -- --keep            # skip the post-run sweep
#   npm run test:e2e -- --grep "comment"  # extra args go through to mocha
#
# There is no container to start: Jira Cloud has no Docker image, so the
# sandbox instance plays the role mysql's disposable container plays there.
set -euo pipefail

cd "$(dirname "$0")/.."

KEEP=0
MOCHA_ARGS=()

for arg in "$@"; do
  case "$arg" in
    --keep) KEEP=1 ;;
    *) MOCHA_ARGS+=("$arg") ;;
  esac
done

missing=()
for var in ATLASSIAN_URL ATLASSIAN_EMAIL ATLASSIAN_API_TOKEN; do
  if [ -z "${!var:-}" ]; then
    missing+=("$var")
  fi
done

if [ "${#missing[@]}" -gt 0 ]; then
  echo "error: missing credentials: ${missing[*]}" >&2
  echo "Nothing in this repo loads .env. Run:  set -a; . ./.env; set +a" >&2
  exit 1
fi

cleanup() {
  if [ "$KEEP" -eq 0 ]; then
    echo "==> Sweeping any fixtures left behind"
    npm run --silent e2e:sweep || true
  else
    echo "==> Leaving fixtures in place (--keep); clean up later with: npm run e2e:sweep"
  fi
}
trap cleanup EXIT

echo "==> Building the CLI"
npm run build

echo "==> Running end-to-end tests against ${ATLASSIAN_URL}"
# The +expansion guard keeps `set -u` happy with an empty array on bash 3.2.
npx mocha --forbid-only "test/e2e/**/*.e2e.test.ts" ${MOCHA_ARGS[@]+"${MOCHA_ARGS[@]}"}
