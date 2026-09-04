# End-to-end test suite implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an end-to-end suite that runs the built `jira` binary as a real subprocess against the live Jira sandbox, covering auth, reads, the issue lifecycle, and the Markdown/ADF round-trip.

**Architecture:** Port the `@hesed/mysql` e2e pattern — a subprocess runner over the built `bin/run.js`, a throwaway config directory injected via `JIRA_CONFIG_DIR`, and a mocha target separate from `npm test`. Jira Cloud has no Docker image, so the disposable MySQL container is replaced by the live sandbox plus label-scoped fixture seeding and a stale sweep. Fixtures are created and destroyed with raw `fetch`, never through the CLI, so they remain an independent oracle.

**Tech Stack:** TypeScript (ESM, `Node16` resolution), mocha + chai, `ts-node/esm`, oclif 4, Node >= 22.19.0, bash for the runner script, GitHub Actions for the nightly run.

**Spec:** `docs/superpowers/specs/2026-09-04-e2e-test-suite-design.md`

## Global Constraints

These apply to every task.

- **ESM + `Node16` resolution: every relative import needs a `.js` extension**, even when the file on disk is `.ts`. `import {runCli} from './helpers.js'`.
- **Never append `--json`.** `BaseCommand.jsonEnabled()` returns true unless `--toon` is present, and `--json` is not a declared flag. Passing it yields `{"error": "Nonexistent flag: --json"}` and a non-zero exit.
- **Never assert on error message text.** The sandbox account's Jira language is not English; a 404 reads `事务不存在或者您没有查看的权限。`. Assert on exit codes, on `success`, and on the HTTP status substring (`'404'`, `'401'`) only.
- **Never print or assert on `jira auth …` output.** `jira auth list` renders the API token in plaintext; keeping it out of test output and CI logs is deliberate.
- **JQL indexing is asynchronous** (~3s observed). Any search for a just-created issue must poll, never search once.
- **The suite targets `bin/run.js`** (the built `dist/`), never `bin/dev.js`.
- **Nothing in this repo loads `.env`.** Credentials must already be exported: `set -a; . ./.env; set +a`.
- **Fixtures live in project `SS`; project `KAN` is left empty** and exists to drive empty-result assertions. Boards 1 and 2 and sprint 1 are pre-existing and read-only.
- **Lint:** `eslint-config-oclif` enforces `perfectionist/sort-objects`. Keep object literals alphabetically sorted, or wrap a block in `/* eslint-disable perfectionist/sort-objects -- reason */`. `test/**` already has the type-checked rules relaxed in `eslint.config.mjs`.
- **`@typescript-eslint/array-type`:** inline object-literal arrays must be written `Array<{id: number}>`, never `{id: number}[]`. Named types and primitives go the other way — `string[]`, `unknown[]`, `Issue[]` and a generic `T[]` are all correct, and `Array<string>` is an error.
- **No regex literals in test files.** `require-unicode-regexp` is configured to demand the `v` flag, and `v` requires TS target es2024 while this repo targets es2022 — eslint and tsc contradict each other. Use string methods instead: `.to.contain('first  \nsecond')`, `.to.not.contain(...)`, `key.startsWith('SS-')`. For hard-break checks this is stricter than the regex was, since it pins the exact two spaces.
- **`npm run posttest` runs lint.** A task is not done until `npm test` is green, which includes lint.

---

### Task 1: Harness — config dir, subprocess runner, npm scripts, runner script

Delivers a working `npm run test:e2e` with one real passing test.

**Files:**
- Create: `test/e2e/helpers.ts`
- Create: `test/e2e/connection.e2e.test.ts`
- Create: `scripts/e2e.sh`
- Modify: `package.json` (the `scripts` block)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `E2E_PROJECT = 'SS'`, `E2E_EMPTY_PROJECT = 'KAN'`, `E2E_BOARD_ID = 2`, `E2E_SPRINT_ID = 1` — exported consts.
  - `type CliResult = {code: number; stderr: string; stdout: string}`
  - `createConfigDir(): Promise<string>`
  - `removeConfigDir(dir: string): Promise<void>`
  - `runCli(args: string[], configDir: string): Promise<CliResult>`
  - `runCliOk(args: string[], configDir: string): Promise<CliResult>`
  - `runCliJson<T>(args: string[], configDir: string): Promise<T>`
  - `requireEnv(): {apiToken: string; email: string; host: string}`

- [ ] **Step 1: Write `test/e2e/helpers.ts`**

```typescript
import {expect} from 'chai'
import {execFile} from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {promisify} from 'node:util'

const execFileAsync = promisify(execFile)

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const CLI = path.join(REPO_ROOT, 'bin', 'run.js')

/** Seeded with fixtures; owns board 2 and sprint 1. */
export const E2E_PROJECT = 'SS'
/** Deliberately left empty, so empty-result assertions have a stable target. */
export const E2E_EMPTY_PROJECT = 'KAN'
export const E2E_BOARD_ID = 2
export const E2E_SPRINT_ID = 1

export type CliResult = {
  code: number
  stderr: string
  stdout: string
}

/**
 * Reads the sandbox credentials from the environment.
 *
 * Nothing in this repo loads .env, so these must already be exported.
 *
 * @returns The host, email and API token.
 */
export function requireEnv(): {apiToken: string; email: string; host: string} {
  const apiToken = process.env.ATLASSIAN_API_TOKEN
  const email = process.env.ATLASSIAN_EMAIL
  const host = process.env.ATLASSIAN_URL

  if (!apiToken || !email || !host) {
    throw new Error(
      'Missing ATLASSIAN_URL, ATLASSIAN_EMAIL or ATLASSIAN_API_TOKEN. ' +
        'Nothing in this repo loads .env — run: set -a; . ./.env; set +a',
    )
  }

  return {apiToken, email, host: host.endsWith('/') ? host.slice(0, -1) : host}
}

/**
 * Writes a throwaway oclif config dir holding a `default` profile pointing at
 * the sandbox and a `broken` profile whose API token is invalid.
 *
 * Credentials are written as literals rather than `env:` references so the
 * suite never depends on a secret backend being reachable.
 *
 * @returns Absolute path to the config dir, to be passed as JIRA_CONFIG_DIR.
 */
export async function createConfigDir(): Promise<string> {
  const {apiToken, email, host} = requireEnv()
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'jira-e2e-'))
  const profile = {apiToken, email, host}

  await fs.writeFile(
    path.join(dir, 'jira-config.json'),
    JSON.stringify(
      {
        defaultProfile: 'default',
        profiles: {
          broken: {...profile, apiToken: 'definitely-not-the-token'},
          default: profile,
        },
      },
      null,
      2,
    ),
    {mode: 0o600},
  )

  return dir
}

export async function removeConfigDir(dir: string): Promise<void> {
  await fs.rm(dir, {force: true, recursive: true})
}

/**
 * Runs the built CLI (`bin/run.js`) as a real subprocess against the sandbox.
 * Non-zero exits are returned rather than thrown so tests can assert on
 * failure paths.
 *
 * @param args Command line arguments, e.g. ['jira', 'project', 'list'].
 * @param configDir Value for JIRA_CONFIG_DIR, from createConfigDir().
 * @returns The exit code and captured stdout/stderr.
 */
export async function runCli(args: string[], configDir: string): Promise<CliResult> {
  try {
    const {stderr, stdout} = await execFileAsync(process.execPath, [CLI, ...args], {
      env: {...process.env, FORCE_COLOR: '0', JIRA_CONFIG_DIR: configDir, NO_COLOR: '1'},
      maxBuffer: 32 * 1024 * 1024,
    })
    return {code: 0, stderr, stdout}
  } catch (error: unknown) {
    const failure = error as {code?: number; stderr?: string; stdout?: string}
    return {code: failure.code ?? 1, stderr: failure.stderr ?? '', stdout: failure.stdout ?? ''}
  }
}

/**
 * Runs the CLI and fails the test if it exited non-zero.
 *
 * @param args Command line arguments.
 * @param configDir Value for JIRA_CONFIG_DIR.
 * @returns The successful result.
 */
export async function runCliOk(args: string[], configDir: string): Promise<CliResult> {
  const result = await runCli(args, configDir)
  expect(result.code, `\`jira ${args.join(' ')}\` failed:\n${result.stdout}\n${result.stderr}`).to.equal(0)
  return result
}

/**
 * Runs the CLI and parses stdout as JSON.
 *
 * JSON is the default output mode (BaseCommand.jsonEnabled()), and `--json` is
 * not a declared flag — do not add one.
 *
 * @param args Command line arguments.
 * @param configDir Value for JIRA_CONFIG_DIR.
 * @returns The parsed JSON payload.
 */
export async function runCliJson<T = unknown>(args: string[], configDir: string): Promise<T> {
  const {stdout} = await runCliOk(args, configDir)
  return JSON.parse(stdout) as T
}
```

- [ ] **Step 2: Write the first failing test, `test/e2e/connection.e2e.test.ts`**

```typescript
import {expect} from 'chai'

import {createConfigDir, removeConfigDir, runCli} from './helpers.js'

describe('e2e: connection', () => {
  let configDir: string

  before(async () => {
    configDir = await createConfigDir()
  })

  after(async () => {
    await removeConfigDir(configDir)
  })

  it('authenticates with the default profile', async () => {
    const {code} = await runCli(['jira', 'auth', 'test'], configDir)
    expect(code).to.equal(0)
  })
})
```

- [ ] **Step 3: Add the npm scripts**

In `package.json`, change `test` and add three scripts. `test` must ignore the e2e directory or the unit suite starts requiring credentials.

```json
"test": "mocha --forbid-only \"test/**/*.test.ts\" --ignore \"test/e2e/**\"",
"test:e2e": "./scripts/e2e.sh",
"e2e:mocha": "mocha --forbid-only \"test/e2e/**/*.e2e.test.ts\"",
"e2e:sweep": "node --loader ts-node/esm --no-warnings scripts/sweep.ts"
```

`e2e:sweep` refers to a file created in Task 2. Add the script now; it will fail until then.

- [ ] **Step 4: Write `scripts/e2e.sh`**

```bash
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
```

- [ ] **Step 5: Make it executable and run it**

```bash
chmod +x scripts/e2e.sh
set -a; . ./.env; set +a
npm run build
npm run e2e:mocha
```

Expected: `e2e: connection ✓ authenticates with the default profile`, 1 passing. Use `e2e:mocha` rather than `test:e2e` here, because `test:e2e` also runs the not-yet-existing sweep.

- [ ] **Step 6: Verify the unit suite still passes and ignores e2e**

```bash
npm test
```

Expected: the existing unit tests pass, lint passes, and no e2e test runs (no credentials needed).

- [ ] **Step 7: Commit**

```bash
git add test/e2e/helpers.ts test/e2e/connection.e2e.test.ts scripts/e2e.sh package.json
git commit -m "test: add e2e harness and connection smoke test"
```

---

### Task 2: Fixtures — seed, cleanup, stale sweep

Seeding goes through raw `fetch`, never the CLI, so a bug in `createIssue` cannot mask itself by also corrupting the fixture it is checked against.

**Files:**
- Create: `test/e2e/fixtures.ts`
- Create: `scripts/sweep.ts`
- Create: `test/e2e/fixtures.e2e.test.ts`

**Interfaces:**
- Consumes: `requireEnv()`, `E2E_PROJECT` from `./helpers.js`.
- Produces:
  - `RUN_ID: string` — short random token, one per process.
  - `RUN_LABEL: string` — `` `e2e-run-${RUN_ID}` ``.
  - `SHARED_LABEL = 'e2e-cli'`
  - `seedIssue(overrides?: Record<string, unknown>): Promise<string>` — returns the issue key.
  - `findByLabel(label: string, extraJql?: string): Promise<string[]>` — returns issue keys.
  - `waitForIndexed(label: string, expected: number): Promise<string[]>`
  - `deleteIssue(key: string): Promise<void>`
  - `cleanupRun(): Promise<void>`
  - `sweepStale(): Promise<number>` — returns the number deleted.

- [ ] **Step 1: Write `test/e2e/fixtures.ts`**

```typescript
import {randomBytes} from 'node:crypto'

import {E2E_PROJECT, requireEnv} from './helpers.js'

/** One token per mocha process, so concurrent runs never delete each other's fixtures. */
export const RUN_ID = randomBytes(4).toString('hex')
export const RUN_LABEL = `e2e-run-${RUN_ID}`
/** Carried by every fixture ever created, so a crashed run can be reclaimed later. */
export const SHARED_LABEL = 'e2e-cli'

type JiraResponse = {body: unknown; status: number}

async function call(method: string, endpoint: string, body?: unknown): Promise<JiraResponse> {
  const {apiToken, email, host} = requireEnv()
  const authorization = `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`

  const response = await fetch(host + endpoint, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {accept: 'application/json', authorization, 'content-type': 'application/json'},
    method,
  })

  const text = await response.text()
  return {body: text ? JSON.parse(text) : null, status: response.status}
}

/**
 * Creates a fixture issue in the seeded project via the REST API directly.
 *
 * Fixtures are never created through the CLI: they are the oracle the CLI is
 * checked against, so they must not share its code path.
 *
 * @param overrides Extra or replacement issue fields.
 * @returns The created issue key.
 */
export async function seedIssue(overrides: Record<string, unknown> = {}): Promise<string> {
  const {body, status} = await call('POST', '/rest/api/3/issue', {
    fields: {
      issuetype: {name: 'Task'},
      labels: [SHARED_LABEL, RUN_LABEL],
      project: {key: E2E_PROJECT},
      summary: `[e2e ${RUN_ID}] fixture`,
      ...overrides,
    },
  })

  if (status !== 201) {
    throw new Error(`seedIssue failed: ${status} ${JSON.stringify(body)}`)
  }

  return (body as {key: string}).key
}

/**
 * Searches for issues carrying a label.
 *
 * @param label The exact label to match.
 * @param extraJql Optional additional JQL, ANDed onto the label clause.
 * @returns The matching issue keys.
 */
export async function findByLabel(label: string, extraJql = ''): Promise<string[]> {
  const jql = `labels = "${label}"${extraJql ? ` AND ${extraJql}` : ''}`
  const {body, status} = await call('POST', '/rest/api/3/search/jql', {
    fields: ['key'],
    jql,
    maxResults: 100,
  })

  if (status !== 200) {
    throw new Error(`findByLabel failed: ${status} ${JSON.stringify(body)}`)
  }

  return ((body as {issues?: Array<{key: string}>}).issues ?? []).map((issue) => issue.key)
}

/**
 * Polls until the expected number of fixtures is visible to JQL.
 *
 * Jira's search index is asynchronous — a freshly created issue took roughly
 * three seconds to become searchable — so a single search would race.
 *
 * @param label The label to search for.
 * @param expected How many issues should be visible.
 * @returns The keys found, which may be fewer than expected if the deadline passes.
 */
export async function waitForIndexed(label: string, expected: number): Promise<string[]> {
  const deadline = Date.now() + 30_000
  let keys: string[] = []

  while (Date.now() < deadline) {
    keys = await findByLabel(label)
    if (keys.length >= expected) return keys
    await new Promise((resolve) => {
      setTimeout(resolve, 1000)
    })
  }

  return keys
}

/**
 * Deletes an issue, tolerating one that is already gone.
 *
 * @param key The issue key.
 */
export async function deleteIssue(key: string): Promise<void> {
  const {status} = await call('DELETE', `/rest/api/3/issue/${key}`)
  if (status !== 204 && status !== 404) {
    throw new Error(`deleteIssue ${key} failed: ${status}`)
  }
}

/**
 * Deletes every fixture created by this process.
 */
export async function cleanupRun(): Promise<void> {
  const keys = await findByLabel(RUN_LABEL)
  await Promise.all(keys.map((key) => deleteIssue(key)))
}

/**
 * Deletes fixtures older than an hour, left behind by a crashed run.
 *
 * The age filter is what makes this safe to run while another suite is in
 * flight: it can only ever reclaim fixtures no live run still owns.
 *
 * @returns How many issues were deleted.
 */
export async function sweepStale(): Promise<number> {
  const keys = await findByLabel(SHARED_LABEL, 'created <= "-1h"')
  await Promise.all(keys.map((key) => deleteIssue(key)))
  return keys.length
}
```

- [ ] **Step 2: Write `scripts/sweep.ts`**

```typescript
import {sweepStale} from '../test/e2e/fixtures.js'

const deleted = await sweepStale()
console.log(`Swept ${deleted} stale e2e fixture(s).`)
```

- [ ] **Step 3: Write the failing test, `test/e2e/fixtures.e2e.test.ts`**

This tests the oracle itself. If seeding is broken, every later task fails for the wrong reason.

```typescript
import {expect} from 'chai'

import {cleanupRun, deleteIssue, findByLabel, RUN_LABEL, seedIssue, waitForIndexed} from './fixtures.js'

describe('e2e: fixtures', () => {
  it('seeds an issue that is findable by its run label, then cleans up', async () => {
    const key = await seedIssue()
    expect(key.startsWith('SS-'), `unexpected key: ${key}`).to.be.true

    const found = await waitForIndexed(RUN_LABEL, 1)
    expect(found).to.include(key)

    await cleanupRun()

    const afterCleanup = await findByLabel(RUN_LABEL)
    expect(afterCleanup).to.not.include(key)
  })

  it('tolerates deleting an issue twice', async () => {
    const key = await seedIssue()
    await deleteIssue(key)
    await deleteIssue(key)
  })

  after(async () => {
    await cleanupRun()
  })
})
```

- [ ] **Step 4: Run it**

```bash
set -a; . ./.env; set +a
npm run e2e:mocha
```

Expected: 3 passing (the connection test plus these two). The first test takes several seconds because of the index wait.

- [ ] **Step 5: Verify the sweep runs standalone**

```bash
npm run e2e:sweep
```

Expected: `Swept 0 stale e2e fixture(s).` — zero, because everything this run created is younger than an hour and was already cleaned up.

- [ ] **Step 6: Verify the sandbox is empty**

```bash
./bin/run.js jira issue search "project = SS" | head -20
```

Expected: `{"data": {"issues": []}, "success": true}`. If anything remains, cleanup is broken — fix it before moving on.

- [ ] **Step 7: Commit**

```bash
git add test/e2e/fixtures.ts test/e2e/fixtures.e2e.test.ts scripts/sweep.ts
git commit -m "test: add e2e fixture seeding, cleanup and stale sweep"
```

---

### Task 3: Connection tests — auth failure modes

Pins the three-way split in how a bad API token surfaces. Jira treats an unauthenticated caller as anonymous rather than rejecting it, so the behaviour is not uniform.

**Files:**
- Modify: `test/e2e/connection.e2e.test.ts`

**Interfaces:**
- Consumes: `createConfigDir`, `removeConfigDir`, `runCli`, `runCliJson`, `E2E_BOARD_ID`, `E2E_PROJECT` from `./helpers.js`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Replace `test/e2e/connection.e2e.test.ts` with the full file**

```typescript
import {expect} from 'chai'

import {createConfigDir, E2E_BOARD_ID, E2E_PROJECT, removeConfigDir, runCli, runCliJson} from './helpers.js'

type Failure = {error: string; success: false}

describe('e2e: connection', () => {
  let configDir: string

  before(async () => {
    configDir = await createConfigDir()
  })

  after(async () => {
    await removeConfigDir(configDir)
  })

  it('authenticates with the default profile', async () => {
    const {code} = await runCli(['jira', 'auth', 'test'], configDir)
    expect(code).to.equal(0)
  })

  it('fails auth test on a bad API token', async () => {
    const {code} = await runCli(['jira', 'auth', 'test', '--profile', 'broken'], configDir)
    expect(code).to.equal(2)
  })

  it('errors on an unknown profile rather than falling back to the default', async () => {
    const {code, stdout} = await runCli(['jira', 'project', 'list', '--profile', 'nosuch'], configDir)
    expect(code).to.equal(1)
    expect(JSON.parse(stdout)).to.deep.equal({error: 'Missing authentication config.'})
  })

  // The Agile API rejects an unauthenticated caller outright, so this is the
  // reliable guard for the `66386d6` contract: success:false must set exit 1.
  it('exits non-zero with success:false when the Agile API rejects the token', async () => {
    const {code, stdout} = await runCli(['jira', 'board', '--profile', 'broken'], configDir)
    expect(code).to.equal(1)

    const payload = JSON.parse(stdout) as Failure
    expect(payload.success).to.be.false
    expect(payload.error).to.contain('401')
  })

  it('exits non-zero with success:false when a single issue is not visible to the token', async () => {
    const {code, stdout} = await runCli(['jira', 'project', E2E_PROJECT, '--profile', 'broken'], configDir)
    expect(code).to.equal(1)

    const payload = JSON.parse(stdout) as Failure
    expect(payload.success).to.be.false
    expect(payload.error).to.contain('404')
  })

  // Pinned as observed, not as desired. Jira answers an anonymous caller with
  // an empty list rather than a 401, so the CLI reports success. Changing that
  // is out of scope; this test makes a future fix a visible, deliberate change.
  it('reports an empty success from list endpoints under a bad token', async () => {
    const payload = await runCliJson<{data: unknown[]; success: boolean}>(
      ['jira', 'project', 'list', '--profile', 'broken'],
      configDir,
    )
    expect(payload.success).to.be.true
    expect(payload.data).to.deep.equal([])
  })

  it('still lists boards for the default profile', async () => {
    const payload = await runCliJson<{data: {values: Array<{id: number}>}}>(['jira', 'board'], configDir)
    expect(payload.data.values.map((board) => board.id)).to.include(E2E_BOARD_ID)
  })
})
```

- [ ] **Step 2: Run it**

```bash
set -a; . ./.env; set +a
npm run e2e:mocha -- --grep "connection"
```

Expected: 7 passing.

- [ ] **Step 3: Commit**

```bash
git add test/e2e/connection.e2e.test.ts
git commit -m "test: cover auth failure modes end to end"
```

---

### Task 4: Read-path tests

**Files:**
- Create: `test/e2e/read.e2e.test.ts`

**Interfaces:**
- Consumes: everything from `./helpers.js`, plus `cleanupRun`, `RUN_ID`, `seedIssue`, `waitForIndexed`, `RUN_LABEL` from `./fixtures.js`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write `test/e2e/read.e2e.test.ts`**

```typescript
import {expect} from 'chai'

import {cleanupRun, RUN_ID, RUN_LABEL, seedIssue, waitForIndexed} from './fixtures.js'
import {
  createConfigDir,
  E2E_BOARD_ID,
  E2E_EMPTY_PROJECT,
  E2E_PROJECT,
  E2E_SPRINT_ID,
  removeConfigDir,
  runCliJson,
  runCliOk,
} from './helpers.js'

type Issue = {fields: Record<string, unknown>; key: string}
type Paged<T> = {isLast: boolean; maxResults: number; startAt: number; total: number; values: T[]}

describe('e2e: read paths', () => {
  let configDir: string
  let seededKey: string
  let secondKey: string

  // Two fixtures, not one: with a single issue in the project a `--max 1`
  // assertion passes whether or not --max works.
  before(async () => {
    configDir = await createConfigDir()
    seededKey = await seedIssue()
    secondKey = await seedIssue()
    await waitForIndexed(RUN_LABEL, 2)
  })

  after(async () => {
    await cleanupRun()
    await removeConfigDir(configDir)
  })

  it('lists both sandbox projects', async () => {
    const payload = await runCliJson<{data: Array<{key: string}>}>(['jira', 'project', 'list'], configDir)
    const keys = payload.data.map((project) => project.key)
    expect(keys).to.include(E2E_PROJECT)
    expect(keys).to.include(E2E_EMPTY_PROJECT)
  })

  it('gets a single project', async () => {
    const payload = await runCliJson<{data: {key: string}; success: boolean}>(
      ['jira', 'project', E2E_PROJECT],
      configDir,
    )
    expect(payload.success).to.be.true
    expect(payload.data.key).to.equal(E2E_PROJECT)
  })

  it('lists boards', async () => {
    const payload = await runCliJson<{data: Paged<{id: number}>}>(['jira', 'board'], configDir)
    expect(payload.data.values.map((board) => board.id)).to.include(E2E_BOARD_ID)
  })

  // Asserted on id and shape, not display name: boards cannot be created via
  // REST, so these are pre-existing fixtures a rename must not break.
  it('lists sprints on the board', async () => {
    const payload = await runCliJson<{data: Paged<{id: number; state: string}>}>(
      ['jira', 'board', 'sprints', String(E2E_BOARD_ID)],
      configDir,
    )
    const sprint = payload.data.values.find((candidate) => candidate.id === E2E_SPRINT_ID)
    expect(sprint, `sprint ${E2E_SPRINT_ID} missing`).to.exist
    expect(sprint!.state).to.be.a('string')
  })

  it('returns a well-formed backlog', async () => {
    const payload = await runCliJson<{data: {issues: Issue[]}; success: boolean}>(
      ['jira', 'board', 'backlogs', String(E2E_BOARD_ID)],
      configDir,
    )
    expect(payload.success).to.be.true
    expect(payload.data.issues).to.be.an('array')
  })

  it('returns well-formed versions', async () => {
    const payload = await runCliJson<{data: Paged<unknown>; success: boolean}>(
      ['jira', 'board', 'versions', String(E2E_BOARD_ID)],
      configDir,
    )
    expect(payload.success).to.be.true
    expect(payload.data.values).to.be.an('array')
  })

  it('finds the seeded issues by JQL', async () => {
    const payload = await runCliJson<{data: {issues: Issue[]}}>(
      ['jira', 'issue', 'search', `labels = "${RUN_LABEL}"`],
      configDir,
    )
    const keys = payload.data.issues.map((issue) => issue.key)
    expect(keys).to.include(seededKey)
    expect(keys).to.include(secondKey)
  })

  it('returns an empty issue list for the empty project and still exits 0', async () => {
    const payload = await runCliJson<{data: {issues: Issue[]}; success: boolean}>(
      ['jira', 'issue', 'search', `project = ${E2E_EMPTY_PROJECT}`],
      configDir,
    )
    expect(payload.success).to.be.true
    expect(payload.data.issues).to.deep.equal([])
  })

  // Scoped to the run label so the count is deterministic, and paired with an
  // unbounded search so the capped result is only reachable if --max works.
  it('honours --max', async () => {
    const unbounded = await runCliJson<{data: {issues: Issue[]}}>(
      ['jira', 'issue', 'search', `labels = "${RUN_LABEL}"`],
      configDir,
    )
    expect(unbounded.data.issues, 'both fixtures should be visible').to.have.lengthOf(2)

    const capped = await runCliJson<{data: {issues: Issue[]}}>(
      ['jira', 'issue', 'search', `labels = "${RUN_LABEL}"`, '--max', '1'],
      configDir,
    )
    expect(capped.data.issues).to.have.lengthOf(1)
  })

  it('resolves the authenticated user by query', async () => {
    const payload = await runCliJson<{data: Array<{accountId: string}>; success: boolean}>(
      ['jira', 'user', '--query', process.env.ATLASSIAN_EMAIL!],
      configDir,
    )
    expect(payload.success).to.be.true
    expect(payload.data[0].accountId).to.be.a('string')
  })

  it('emits TOON rather than JSON under --toon', async () => {
    const {stdout} = await runCliOk(['jira', 'project', 'list', '--toon'], configDir)
    expect(() => JSON.parse(stdout)).to.throw()
    expect(stdout).to.contain('success: true')
    expect(stdout).to.contain(E2E_PROJECT)
  })

  it('includes the run id in the seeded summary', async () => {
    const payload = await runCliJson<{data: {fields: {summary: string}}}>(['jira', 'issue', seededKey], configDir)
    expect(payload.data.fields.summary).to.contain(RUN_ID)
  })
})
```

- [ ] **Step 2: Run it**

```bash
set -a; . ./.env; set +a
npm run e2e:mocha -- --grep "read paths"
```

Expected: 12 passing.

- [ ] **Step 3: Confirm cleanup left nothing behind**

```bash
./bin/run.js jira issue search "project = SS" | head -20
```

Expected: an empty `issues` array.

- [ ] **Step 4: Commit**

```bash
git add test/e2e/read.e2e.test.ts
git commit -m "test: cover project, board and search read paths end to end"
```

---

### Task 5: Issue lifecycle tests

Exercises the write path through the CLI: create, read, update, assign, transition, delete.

**Files:**
- Create: `test/e2e/issue-lifecycle.e2e.test.ts`

**Interfaces:**
- Consumes: `./helpers.js` exports, plus `cleanupRun`, `deleteIssue`, `RUN_ID`, `RUN_LABEL`, `SHARED_LABEL` from `./fixtures.js`.
- Produces: nothing consumed by later tasks.

Issues created here go through `jira issue create`, which is the code under test, so they must be labelled explicitly to stay sweepable.

- [ ] **Step 1: Write `test/e2e/issue-lifecycle.e2e.test.ts`**

```typescript
import {expect} from 'chai'

import {cleanupRun, deleteIssue, RUN_ID, RUN_LABEL, SHARED_LABEL} from './fixtures.js'
import {createConfigDir, E2E_PROJECT, removeConfigDir, runCli, runCliJson} from './helpers.js'

type Created = {data: {key: string}; success: boolean}
type Fetched = {
  data: {fields: {assignee: null | {accountId: string}; status: {name: string}; summary: string}}
  success: boolean
}

/** Labels every created issue so the stale sweep can reclaim it if a test dies. */
const LABELS = JSON.stringify([SHARED_LABEL, RUN_LABEL])

describe('e2e: issue lifecycle', () => {
  let configDir: string
  const created: string[] = []

  before(async () => {
    configDir = await createConfigDir()
  })

  after(async () => {
    await Promise.all(created.map((key) => deleteIssue(key)))
    await cleanupRun()
    await removeConfigDir(configDir)
  })

  async function createIssue(summary: string): Promise<string> {
    const payload = await runCliJson<Created>(
      [
        'jira',
        'issue',
        'create',
        '--fields',
        `project={"key":"${E2E_PROJECT}"}`,
        '--fields',
        'issuetype={"name":"Task"}',
        '--fields',
        `summary=${summary}`,
        '--fields',
        'description=created by the e2e suite',
        '--fields',
        `labels=${LABELS}`,
      ],
      configDir,
    )
    expect(payload.success).to.be.true
    created.push(payload.data.key)
    return payload.data.key
  }

  it('creates an issue and reads it back', async () => {
    const summary = `[e2e ${RUN_ID}] lifecycle create`
    const key = await createIssue(summary)
    expect(key.startsWith('SS-'), `unexpected key: ${key}`).to.be.true

    const fetched = await runCliJson<Fetched>(['jira', 'issue', key], configDir)
    expect(fetched.success).to.be.true
    expect(fetched.data.fields.summary).to.equal(summary)
  })

  it('updates the summary', async () => {
    const key = await createIssue(`[e2e ${RUN_ID}] lifecycle update`)
    const updated = `[e2e ${RUN_ID}] lifecycle updated`

    const {code} = await runCli(['jira', 'issue', 'update', key, '--fields', `summary=${updated}`], configDir)
    expect(code).to.equal(0)

    const fetched = await runCliJson<Fetched>(['jira', 'issue', key], configDir)
    expect(fetched.data.fields.summary).to.equal(updated)
  })

  it('assigns the issue to an assignable user', async () => {
    const key = await createIssue(`[e2e ${RUN_ID}] lifecycle assign`)

    const assignable = await runCliJson<{data: Array<{accountId: string}>}>(
      ['jira', 'user', 'list-assignable', key],
      configDir,
    )
    expect(assignable.data.length, 'no assignable users on the sandbox').to.be.greaterThan(0)
    const {accountId} = assignable.data[0]

    const {code} = await runCli(['jira', 'issue', 'assign', key, accountId], configDir)
    expect(code).to.equal(0)

    const fetched = await runCliJson<Fetched>(['jira', 'issue', key], configDir)
    expect(fetched.data.fields.assignee?.accountId).to.equal(accountId)
  })

  it('lists transitions and moves the issue', async () => {
    const key = await createIssue(`[e2e ${RUN_ID}] lifecycle transition`)

    const transitions = await runCliJson<{data: {transitions: Array<{id: string; name: string}>}}>(
      ['jira', 'issue', 'transitions', key],
      configDir,
    )
    expect(transitions.data.transitions.length).to.be.greaterThan(0)

    const before = await runCliJson<Fetched>(['jira', 'issue', key], configDir)
    const target = transitions.data.transitions.find((t) => t.name !== before.data.fields.status.name)
    expect(target, 'no transition leads away from the current status').to.exist

    const {code} = await runCli(['jira', 'issue', 'transition', key, target!.id], configDir)
    expect(code).to.equal(0)

    const after = await runCliJson<Fetched>(['jira', 'issue', key], configDir)
    expect(after.data.fields.status.name).to.not.equal(before.data.fields.status.name)
  })

  it('deletes the issue, after which reading it fails', async () => {
    const key = await createIssue(`[e2e ${RUN_ID}] lifecycle delete`)

    const {code} = await runCli(['jira', 'issue', 'delete', key], configDir)
    expect(code).to.equal(0)

    const {code: readCode, stdout} = await runCli(['jira', 'issue', key], configDir)
    expect(readCode).to.equal(1)

    const payload = JSON.parse(stdout) as {error: string; success: boolean}
    expect(payload.success).to.be.false
    expect(payload.error).to.contain('404')
  })
})
```

- [ ] **Step 2: Run it**

```bash
set -a; . ./.env; set +a
npm run e2e:mocha -- --grep "issue lifecycle"
```

Expected: 5 passing.

- [ ] **Step 3: Confirm the sandbox is clean**

```bash
./bin/run.js jira issue search "project = SS" | head -20
```

Expected: an empty `issues` array. If not, the `after` hook is not deleting CLI-created issues — check that `labels=` reached Jira.

- [ ] **Step 4: Commit**

```bash
git add test/e2e/issue-lifecycle.e2e.test.ts
git commit -m "test: cover the issue create-to-delete lifecycle end to end"
```

---

### Task 6: Content tests — Markdown/ADF round-trip, comments, worklogs

> Payload shapes in this task and Task 7 were observed against the live
> sandbox, not inferred: `issue comment` returns `data.id`; `issue worklog`
> returns `data.id` and `data.timeSpent`; `issue worklogs` returns
> `data.worklogs`; `issue attachment` returns an array whose first element has
> an `id`. A comment body round-trips as `"first  \nsecond"`, so comments carry
> hard breaks exactly as descriptions do.

The highest-value file. `markdownToAdfDocument()` inserts explicit hard breaks so single newlines survive in paragraphs, blockquotes and list items but not in code blocks, tables or headings; `processIssueRenderedAndFields()` converts the rendered HTML back with turndown. Only a real Jira closes that loop.

**Files:**
- Create: `test/e2e/content.e2e.test.ts`

**Interfaces:**
- Consumes: `./helpers.js` exports, plus `cleanupRun`, `deleteIssue`, `RUN_ID`, `RUN_LABEL`, `SHARED_LABEL` from `./fixtures.js`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write `test/e2e/content.e2e.test.ts`**

```typescript
import {expect} from 'chai'

import {cleanupRun, deleteIssue, RUN_ID, RUN_LABEL, SHARED_LABEL} from './fixtures.js'
import {createConfigDir, E2E_PROJECT, removeConfigDir, runCli, runCliJson} from './helpers.js'

const LABELS = JSON.stringify([SHARED_LABEL, RUN_LABEL])

type Fetched = {
  data: {fields: {comment?: {comments: Array<{body: string; id: string}>}; description: string}}
  success: boolean
}

describe('e2e: content and ADF round-trip', () => {
  let configDir: string
  const created: string[] = []

  before(async () => {
    configDir = await createConfigDir()
  })

  after(async () => {
    await Promise.all(created.map((key) => deleteIssue(key)))
    await cleanupRun()
    await removeConfigDir(configDir)
  })

  async function createIssue(description: string): Promise<string> {
    const payload = await runCliJson<{data: {key: string}}>(
      [
        'jira',
        'issue',
        'create',
        '--fields',
        `project={"key":"${E2E_PROJECT}"}`,
        '--fields',
        'issuetype={"name":"Task"}',
        '--fields',
        `summary=[e2e ${RUN_ID}] content`,
        '--fields',
        `description=${description}`,
        '--fields',
        `labels=${LABELS}`,
      ],
      configDir,
    )
    created.push(payload.data.key)
    return payload.data.key
  }

  it('preserves single newlines in a paragraph as hard breaks', async () => {
    const key = await createIssue('line one\nline two')
    const fetched = await runCliJson<Fetched>(['jira', 'issue', key], configDir)

    // Turndown renders an ADF hardBreak as two trailing spaces before the
    // newline. Collapsing to "line one line two" means the hard-break
    // preprocessing in src/markdown.ts regressed.
    expect(fetched.data.fields.description).to.contain('line one')
    expect(fetched.data.fields.description).to.contain('line two')
    expect(fetched.data.fields.description).to.contain('line one  \nline two')
  })

  it('round-trips headings, lists and code blocks', async () => {
    const description = ['# Heading', '', '- item one', '- item two', '', '```bash', 'ls -a', 'echo hi', '```'].join(
      '\n',
    )
    const key = await createIssue(description)
    const fetched = await runCliJson<Fetched>(['jira', 'issue', key], configDir)
    const body = fetched.data.fields.description

    expect(body).to.contain('Heading')
    expect(body).to.contain('item one')
    expect(body).to.contain('item two')
    // Inside a code block the newline must stay raw — no hard-break padding.
    expect(body).to.contain('ls -a')
    expect(body).to.contain('echo hi')
    expect(body).to.not.contain('ls -a  \n')
  })

  it('unescapes a literal \\n typed inside one shell argument', async () => {
    const key = await createIssue(String.raw`alpha\nbravo`)
    const fetched = await runCliJson<Fetched>(['jira', 'issue', key], configDir)

    expect(fetched.data.fields.description).to.not.contain(String.raw`\n`)
    expect(fetched.data.fields.description).to.contain('alpha')
    expect(fetched.data.fields.description).to.contain('bravo')
  })

  it('adds, updates and deletes a comment', async () => {
    const key = await createIssue('comment host')

    const added = await runCliJson<{data: {id: string}; success: boolean}>(
      ['jira', 'issue', 'comment', key, 'first\nsecond'],
      configDir,
    )
    expect(added.success).to.be.true
    const commentId = added.data.id

    const withComment = await runCliJson<Fetched>(['jira', 'issue', key], configDir)
    const comment = withComment.data.fields.comment?.comments.find((c) => c.id === commentId)
    expect(comment, 'comment missing from the issue').to.exist
    expect(comment!.body).to.contain('first  \nsecond')

    const {code: updateCode} = await runCli(
      ['jira', 'issue', 'comment-update', key, commentId, 'edited body'],
      configDir,
    )
    expect(updateCode).to.equal(0)

    const afterUpdate = await runCliJson<Fetched>(['jira', 'issue', key], configDir)
    const edited = afterUpdate.data.fields.comment?.comments.find((c) => c.id === commentId)
    expect(edited!.body).to.contain('edited body')

    const {code: deleteCode} = await runCli(['jira', 'issue', 'comment-delete', key, commentId], configDir)
    expect(deleteCode).to.equal(0)

    const afterDelete = await runCliJson<Fetched>(['jira', 'issue', key], configDir)
    const ids = (afterDelete.data.fields.comment?.comments ?? []).map((c) => c.id)
    expect(ids).to.not.include(commentId)
  })

  it('adds, lists and deletes a worklog', async () => {
    const key = await createIssue('worklog host')
    const started = '2026-09-01T09:00:00.000+0000'

    const added = await runCliJson<{data: {id: string}; success: boolean}>(
      ['jira', 'issue', 'worklog', key, started, '1h', 'e2e worklog'],
      configDir,
    )
    expect(added.success).to.be.true
    const worklogId = added.data.id

    const listed = await runCliJson<{data: {worklogs: Array<{id: string; timeSpent: string}>}}>(
      ['jira', 'issue', 'worklogs', key],
      configDir,
    )
    const entry = listed.data.worklogs.find((w) => w.id === worklogId)
    expect(entry, 'worklog missing').to.exist
    expect(entry!.timeSpent).to.equal('1h')

    const {code} = await runCli(['jira', 'issue', 'worklog-delete', key, worklogId], configDir)
    expect(code).to.equal(0)

    const afterDelete = await runCliJson<{data: {worklogs: Array<{id: string}>}}>(
      ['jira', 'issue', 'worklogs', key],
      configDir,
    )
    expect(afterDelete.data.worklogs.map((w) => w.id)).to.not.include(worklogId)
  })
})
```

- [ ] **Step 2: Run it**

```bash
set -a; . ./.env; set +a
npm run e2e:mocha -- --grep "content and ADF"
```

Expected: 5 passing.

If the hard-break assertions fail, print the raw value before changing the test — `console.log(JSON.stringify(body))` — and confirm against the probe result recorded in the spec (`"line one  \nline two"`). Adjust the assertion only if the real output differs in whitespace shape, never by deleting the assertion.

- [ ] **Step 3: Confirm the sandbox is clean, then commit**

```bash
./bin/run.js jira issue search "project = SS" | head -20
git add test/e2e/content.e2e.test.ts
git commit -m "test: cover the markdown-to-ADF round trip, comments and worklogs"
```

---

### Task 7: Attachment and development-info tests

Attachments exercise the plain-`fetch` download path that bypasses `jira.js`, plus `configureFetchProxy`.

**Files:**
- Create: `test/e2e/attachment.e2e.test.ts`

**Interfaces:**
- Consumes: `./helpers.js` exports, plus `cleanupRun`, `deleteIssue`, `RUN_ID`, `RUN_LABEL`, `SHARED_LABEL` from `./fixtures.js`.
- Produces: nothing.

The fixture file is written at runtime into a temp dir rather than committed, so the repo gains no binary blob.

- [ ] **Step 1: Write `test/e2e/attachment.e2e.test.ts`**

```typescript
import {expect} from 'chai'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {cleanupRun, deleteIssue, RUN_ID, RUN_LABEL, SHARED_LABEL} from './fixtures.js'
import {createConfigDir, E2E_PROJECT, removeConfigDir, runCli, runCliJson} from './helpers.js'

const LABELS = JSON.stringify([SHARED_LABEL, RUN_LABEL])
const FILE_BODY = 'e2e attachment fixture\nsecond line\n'

describe('e2e: attachments and dev info', () => {
  let configDir: string
  let workDir: string
  let issueKey: string

  before(async () => {
    configDir = await createConfigDir()
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jira-e2e-files-'))

    const payload = await runCliJson<{data: {key: string}}>(
      [
        'jira',
        'issue',
        'create',
        '--fields',
        `project={"key":"${E2E_PROJECT}"}`,
        '--fields',
        'issuetype={"name":"Task"}',
        '--fields',
        `summary=[e2e ${RUN_ID}] attachments`,
        '--fields',
        'description=attachment host',
        '--fields',
        `labels=${LABELS}`,
      ],
      configDir,
    )
    issueKey = payload.data.key
  })

  after(async () => {
    if (issueKey) await deleteIssue(issueKey)
    await cleanupRun()
    await removeConfigDir(configDir)
    await fs.rm(workDir, {force: true, recursive: true})
  })

  it('uploads a file and downloads it back byte-for-byte', async () => {
    const source = path.join(workDir, 'fixture.txt')
    await fs.writeFile(source, FILE_BODY)

    const uploaded = await runCliJson<{data: Array<{id: string}>; success: boolean}>(
      ['jira', 'issue', 'attachment', issueKey, source],
      configDir,
    )
    expect(uploaded.success).to.be.true
    expect(uploaded.data.length).to.equal(1)
    const attachmentId = uploaded.data[0].id

    const target = path.join(workDir, 'downloaded.txt')
    const downloaded = await runCliJson<{success: boolean}>(
      ['jira', 'issue', 'attachment-download', issueKey, attachmentId, target],
      configDir,
    )
    expect(downloaded.success).to.be.true

    expect(await fs.readFile(target, 'utf8')).to.equal(FILE_BODY)
  })

  it('fails cleanly when the file does not exist', async () => {
    const {code, stdout} = await runCli(
      ['jira', 'issue', 'attachment', issueKey, path.join(workDir, 'nope.txt')],
      configDir,
    )
    expect(code).to.equal(1)

    const payload = JSON.parse(stdout) as {error: string; success: boolean}
    expect(payload.success).to.be.false
    expect(payload.error).to.contain('File not found')
  })

  it('returns a well-formed dev-info payload for an issue with no linked work', async () => {
    const payload = await runCliJson<{data: unknown; success: boolean}>(['jira', 'issue', 'dev', issueKey], configDir)
    expect(payload.success).to.be.true
    expect(payload.data).to.be.an('object')
  })
})
```

- [ ] **Step 2: Run it**

```bash
set -a; . ./.env; set +a
npm run e2e:mocha -- --grep "attachments and dev"
```

Expected: 3 passing.

The `File not found` assertion is the one place message text is asserted, and it is safe: that string is produced by this repo (`src/jira/jira-api.ts:34`), not by Jira, so it is not localised.

- [ ] **Step 3: Run the whole suite twice in a row**

This is the spec's own acceptance check for fixture hygiene.

```bash
set -a; . ./.env; set +a
npm run e2e:mocha && npm run e2e:mocha
./bin/run.js jira issue search "project = SS" | head -20
```

Expected: both runs green, and the final search returns an empty `issues` array.

- [ ] **Step 4: Verify the suite fails loudly on a bad token**

The spec's second acceptance check. A suite that silently skips when
credentials are wrong is worse than no suite.

```bash
set -a; . ./.env; set +a
ATLASSIAN_API_TOKEN=definitely-not-the-token npm run e2e:mocha; echo "exit=$?"
```

Expected: a non-zero exit and many failures. Specifically NOT: zero tests run,
all tests skipped, or a green run.

- [ ] **Step 5: Commit**

```bash
git add test/e2e/attachment.e2e.test.ts
git commit -m "test: cover attachment upload, download and dev info end to end"
```

---

### Task 8: Nightly CI workflow and documentation

**Files:**
- Create: `.github/workflows/run-e2e-tests.yml`
- Modify: `CLAUDE.md` (the Testing section)
- Modify: `README.md` (contributing/testing prose only, never the generated `<!-- commands -->` block)

**Interfaces:**
- Consumes: the `test:e2e`, `e2e:mocha` and `e2e:sweep` scripts from Tasks 1 and 2.
- Produces: nothing.

Triggered nightly and on demand, not per pull request: concurrent PR runs would share one sandbox project, Atlassian rate limits are per-instance, and fork PRs cannot read secrets. Because it is not a merge gate, it needs no gating job — unlike `run-tests.yml`.

- [ ] **Step 1: Write `.github/workflows/run-e2e-tests.yml`**

```yaml
name: Run end-to-end tests

permissions: read-all

# Nightly and on demand only. These tests share one live Jira sandbox, so
# running them per pull request would let concurrent runs collide, and fork
# PRs cannot read the secrets they need.
on:
  schedule:
    - cron: '17 3 * * *'
  workflow_dispatch:

concurrency:
  group: jira-e2e
  cancel-in-progress: false

jobs:
  run-e2e-tests:
    name: End-to-end tests against the Jira sandbox
    runs-on: ubuntu-latest
    env:
      ATLASSIAN_API_TOKEN: ${{ secrets.ATLASSIAN_API_TOKEN }}
      ATLASSIAN_EMAIL: ${{ secrets.ATLASSIAN_EMAIL }}
      ATLASSIAN_URL: ${{ secrets.ATLASSIAN_URL }}
    steps:
      - name: Check out repository
        uses: actions/checkout@v5
        with:
          fetch-depth: 2

      - name: Set up Node.js
        uses: actions/setup-node@v6
        with:
          cache: npm
          node-version-file: '.nvmrc'

      - name: Install dependencies
        run: npm ci

      # The steps below are what `npm run test:e2e` does locally, split out so
      # the sweep still runs when a test fails.
      - name: Build the CLI
        run: npm run build

      - name: Run end-to-end tests
        run: npm run e2e:mocha

      - name: Sweep leftover fixtures
        if: always()
        run: npm run e2e:sweep
```

- [ ] **Step 2: Add the repository secrets**

In GitHub → Settings → Secrets and variables → Actions, add `ATLASSIAN_URL`, `ATLASSIAN_EMAIL` and `ATLASSIAN_API_TOKEN`. Without them the nightly job fails at the credential preflight.

- [ ] **Step 3: Document the suite in `CLAUDE.md`**

Append to the `## Testing` section:

```markdown
### End-to-end tests

`test/e2e/**` runs the built `bin/run.js` as a real subprocess against the live
Jira sandbox. It is excluded from `npm test` and needs credentials exported
first, because nothing in this repo loads `.env`:

```bash
set -a; . ./.env; set +a
npm run test:e2e              # build, run, then sweep
npm run test:e2e -- --keep    # leave fixtures behind for inspection
npm run e2e:mocha             # run without rebuilding
npm run e2e:sweep             # delete fixtures older than an hour
```

Four rules specific to this suite:

- **Never pass `--json`.** JSON is already the default (`BaseCommand.jsonEnabled()`);
  `--json` is not a declared flag and the command will fail to parse.
- **Never assert on error message text.** The sandbox account's Jira language is
  not English. Assert on exit codes, `success`, and the HTTP status substring.
- **Fixtures are created with raw `fetch` in `test/e2e/fixtures.ts`, never
  through the CLI** — they are the oracle the CLI is checked against.
- **Every fixture carries the `e2e-cli` and `e2e-run-<id>` labels.** JQL indexing
  is asynchronous, so searches for fresh issues poll via `waitForIndexed`.

Fixtures go in project `SS`; `KAN` is deliberately kept empty so empty-result
assertions have a stable target.
```

- [ ] **Step 4: Add a short testing note to `README.md`**

Only in hand-written prose. The `<!-- commands -->` block is generated by `oclif readme` during `prepack` — never edit it.

```markdown
### End-to-end tests

The e2e suite runs the built binary against a live Jira sandbox and is excluded
from `npm test`. See the Testing section of `CLAUDE.md` for how to run it.
```

- [ ] **Step 5: Validate the workflow and the docs**

```bash
npm test
```

Expected: unit tests and lint pass. Check the YAML parses:

```bash
node -e "import('node:fs').then(fs => console.log(fs.readFileSync('.github/workflows/run-e2e-tests.yml','utf8').length + ' bytes'))"
```

Then trigger the workflow manually from the Actions tab once the secrets exist, and confirm it goes green.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/run-e2e-tests.yml CLAUDE.md README.md
git commit -m "ci: run the end-to-end suite nightly against the Jira sandbox"
```

---

## Acceptance

The suite is done when all of these hold:

1. `npm test` passes without credentials and runs no e2e test.
2. `npm run test:e2e` passes with credentials exported.
3. Running the suite twice back to back leaves `jira issue search "project = SS"` returning an empty list.
4. Running it with a deliberately corrupted `ATLASSIAN_API_TOKEN` makes tests fail loudly rather than skip.
5. The nightly workflow completes green on a manual dispatch.
