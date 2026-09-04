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

# Pins the fixture label for this invocation so the post-run sweep, which is a
# separate process from mocha, can reclaim *this* run's fixtures and not only
# the ones older than an hour.
E2E_RUN_ID="${E2E_RUN_ID:-local-$$}"
export E2E_RUN_ID

# Runs on the way out, including after a failing mocha. A sweep failure leaves
# fixtures in the shared sandbox, so it must not be swallowed: it surfaces as a
# non-zero exit unless the tests already failed, in which case that status is
# the more useful one to keep.
cleanup() {
  local status=$?

  if [ "$KEEP" -ne 0 ]; then
    echo "==> Leaving fixtures in place (--keep); clean up later with: npm run e2e:sweep"
    exit "$status"
  fi

  echo "==> Sweeping any fixtures left behind"
  if npm run --silent e2e:sweep; then
    exit "$status"
  fi

  echo "error: sweeping fixtures failed; the sandbox may still hold e2e issues" >&2
  if [ "$status" -eq 0 ]; then
    exit 1
  fi

  exit "$status"
}
trap cleanup EXIT

echo "==> Building the CLI"
npm run build

echo "==> Running end-to-end tests against ${ATLASSIAN_URL}"
# Delegates to the `e2e:mocha` script rather than calling mocha directly, so
# both entry points share one glob and one timeout.
# The +expansion guard keeps `set -u` happy with an empty array on bash 3.2.
npm run --silent e2e:mocha -- ${MOCHA_ARGS[@]+"${MOCHA_ARGS[@]}"}
