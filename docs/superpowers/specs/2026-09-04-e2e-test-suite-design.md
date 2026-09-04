# End-to-end test suite design

Status: proposed
Date: 2026-09-04

## Purpose

The unit suite under `test/` mocks both the client module and `@hesed/plugin-lib`.
It proves the command layer wires arguments through correctly, but it never
executes the built binary, never loads a config file, never speaks HTTP, and
never round-trips a document through Atlassian Document Format. Three classes of
regression are therefore invisible to it:

1. **Markdown to ADF and back.** `markdownToAdfDocument()` inserts explicit hard
   breaks so single newlines survive; `processIssueRenderedAndFields()` converts
   the rendered HTML back with turndown. Only a real Jira closes that loop.
2. **Process-level behaviour.** Exit codes, `--json` versus `--toon` output on
   stdout, oclif argument parsing, config-file discovery. The fix in `66386d6`
   ("exit non-zero on API failures") is precisely this class.
3. **API contract drift.** Field names, pagination tokens, and error shapes
   returned by Jira Cloud and the Agile API.

The suite closes all three by running the built `bin/run.js` as a subprocess
against a live Jira sandbox.

## Backend: the live sandbox

`@hesed/mysql` runs its e2e suite against a disposable MySQL container. Jira
Cloud has no Docker image, so there is nothing to `docker compose up`. The
substitute is the existing sandbox instance, which is empty and disposable in
practice:

- Two projects, `KAN` (Sidekick) and `SS` (Sidekick Sprint).
- Zero issues.
- Two boards, ids 1 and 2; board 2 owns sprint 1 (`SS Sprint 1`, state `future`).

A probe confirmed the credentials in `.env` can create, read, list transitions
for, and delete an issue, and that a two-line Markdown description survives the
ADF round-trip as `"line one  \nline two"`.

### Mapping from the mysql suite

| mysql | jira |
| --- | --- |
| `docker/` disposable server with baked-in seed | live sandbox plus per-run seed and teardown in mocha hooks |
| `mq_e2e` seeded database | project `SS`, seeded with fixtures; owns board 2 and sprint 1 |
| `mq_e2e_empty` | project `KAN`, left empty; drives empty-result assertions |
| `broken` profile with a bad password | `broken` profile with a bad API token |
| `MQ_E2E_PORT` | `ATLASSIAN_URL`, `ATLASSIAN_EMAIL`, `ATLASSIAN_API_TOKEN` |
| `MQ_CONFIG_DIR` temp dir | `JIRA_CONFIG_DIR` temp dir |
| `tmpfs`, so every `up` is clean | run-scoped fixture tagging plus a stale sweep |

`@oclif/core` reads `<BIN>_CONFIG_DIR` (`config.js:277`), and this package's
oclif `bin` is `jira`, so `JIRA_CONFIG_DIR` redirects `this.config.configDir`
without any production code change.

## Components

### `test/e2e/helpers.ts`

A near-verbatim port of the mysql helper. Exports:

- `createConfigDir()` — writes `jira-config.json` into a `mkdtemp` directory at
  mode `0600` and returns the path. Profiles:
  - `default` — the sandbox credentials read from the environment.
  - `broken` — same host and email, API token replaced with a bad literal.
  Credentials are written as literals, not `env:` references, so the suite does
  not depend on `resolveSecrets` reaching a secret backend.
- `removeConfigDir(dir)`
- `runCli(args, configDir)` — spawns `process.execPath bin/run.js …` with
  `JIRA_CONFIG_DIR`, `NO_COLOR=1`, `FORCE_COLOR=0`. Returns
  `{code, stdout, stderr}`; a non-zero exit is returned, not thrown, so failure
  paths are assertable.
- `runCliOk(args, configDir)` — asserts exit 0, surfacing stderr on failure.
- `runCliJson<T>(args, configDir)` — appends `--json`, parses stdout.

The suite runs `bin/run.js` (the built `dist/`), not `bin/dev.js`, so it tests
the artifact that ships.

### `test/e2e/fixtures.ts`

Seeding and teardown go through raw `fetch` with a Basic auth header built from
the environment, never through the CLI. This mirrors mysql seeding with SQL
rather than with `mq query`: the fixtures must be an independent oracle, so a
bug in `createIssue` cannot mask itself by also corrupting the fixture it is
checked against.

Exports:

- `RUN_ID` — a short random token, generated once per process.
- `seedIssue(overrides)` — `POST /rest/api/3/issue` into `SS`. Every fixture
  carries two labels, `e2e-cli` and `e2e-run-<RUN_ID>`, and a summary prefixed
  `[e2e RUN_ID] ` for human legibility. Returns the created key.
- `cleanupRun()` — JQL-searches `labels = "e2e-run-<RUN_ID>"` and deletes each
  result.
- `sweepStale()` — deletes any issue matching
  `labels = "e2e-cli" AND created <= -1h`.

Selection is by label, not by summary text. JQL's `~` operator runs a tokenized
text match that discards punctuation, so `summary ~ "[e2e abc123]"` would match
far more than intended; `labels =` is an exact term match.

`sweepStale()` replaces the guarantee mysql gets free from `tmpfs`. Without it a
crashed run leaves fixtures in the sandbox permanently; with it, the next run
reclaims them while never touching fixtures belonging to a run still in flight.

### Test files

`test/e2e/connection.e2e.test.ts`
- `jira auth test` against `default` exits 0.
- `jira auth test --profile broken` exits non-zero and reports a failure.
- A read command under `--profile broken` exits non-zero with
  `success: false` in the JSON payload — the `66386d6` regression.
- An unknown profile name errors rather than silently falling back.

`test/e2e/read.e2e.test.ts` — one seeded issue so the search assertions have
something to find; otherwise every assertion is a read.
- `jira project list` contains `KAN` and `SS`.
- `jira project SS` returns the project.
- `jira board` lists boards 1 and 2.
- `jira board sprints 2` includes sprint 1.
- `jira board backlogs 2` and `jira board versions 2` return well-formed payloads.
- `jira issue search "project = KAN"` returns an empty issue list and still
  exits 0 — the empty-result case, and why `KAN` stays empty.
- `jira issue search` with `--max` and `--next` pages correctly.
- `jira user --query <email>` resolves the authenticated account.
- `--toon` on one read command emits TOON on stdout rather than JSON.

Board and sprint assertions check ids and shape, not display names. Boards
cannot be created through the REST API, so board 1, board 2 and sprint 1 are
pre-existing fixtures; loose assertions keep a rename from turning the suite red.

`test/e2e/issue-lifecycle.e2e.test.ts`
- `jira issue create` into `SS`, then `jira issue <key>` returns matching fields.
- `jira issue update <key> --fields summary=…` is reflected on the next read.
- `jira user list-assignable <key>` yields an accountId; `jira issue assign`
  applies it; the read shows the new assignee.
- `jira issue transitions <key>` lists `11/21/31`; `jira issue transition`
  moves the issue and the status changes.
- `jira issue delete <key>` exits 0 and a subsequent read exits non-zero.

`test/e2e/content.e2e.test.ts` — the ADF surface.
- Create an issue whose description contains a multi-line paragraph, a heading,
  a bullet list, a fenced code block and a table. Read it back and assert that
  single newlines inside the paragraph survived as hard breaks, and that the
  code block and table kept their raw text. This is the `src/markdown.ts`
  contract, verified against a real Jira.
- `jira issue comment` then `jira issue <key>` shows the comment body converted
  back to Markdown; `comment-update` and `comment-delete` complete the cycle.
- `jira issue worklog`, `jira issue worklogs`, `jira issue worklog-delete`.
- `jira issue attachment <key> <file>` with a small fixture file, then
  `jira issue attachment-download` into a temp directory, asserting the bytes
  round-trip. This exercises the plain-`fetch` path that bypasses `jira.js`.
- `jira issue dev <key>` returns a well-formed payload for an issue with no
  linked development information.

Each file seeds in `before` and calls `cleanupRun()` in `after`, so a file that
fails partway still cleans up after itself.

### `scripts/e2e.sh`

Structurally the mysql script minus Docker:

1. Fail fast with a clear message if `ATLASSIAN_URL`, `ATLASSIAN_EMAIL` or
   `ATLASSIAN_API_TOKEN` is unset. Nothing in this repo loads `.env`, so the
   message tells the reader to run `set -a; . ./.env; set +a`.
2. `npm run build`.
3. `npx mocha --forbid-only "test/e2e/**/*.e2e.test.ts"`, forwarding extra args.
4. On exit, run the sweep unless `--keep` was passed.

### `package.json`

- `test` gains `--ignore "test/e2e/**"`, exactly as mysql does. Without it the
  existing unit suite would start requiring credentials.
- `test:e2e` runs `./scripts/e2e.sh`.
- `e2e:mocha` runs mocha alone, for CI and for iterating without a rebuild.
- `e2e:sweep` runs the stale sweep alone, as a manual recovery tool.

### `.github/workflows/run-e2e-tests.yml`

Triggered by `schedule` (nightly) and `workflow_dispatch`, not by pull requests.
Three reasons: concurrent PR runs would share one sandbox project; Atlassian
rate limits are per-instance; and fork PRs cannot read secrets. Because it is
not a merge gate, no gating job is needed — unlike the mysql workflow.

Credentials come from repository secrets. The job checks out, installs, builds,
runs `e2e:mocha`, and runs `e2e:sweep` in an `always()` step so a cancelled run
cannot leak fixtures.

## Error handling

Commands never throw; the API layer catches and returns
`{error, success: false}`. The suite therefore asserts on two channels
independently — the process exit code and the `success` field in the JSON
payload — because they are set in different places and have drifted apart
before.

## Testing the tests

The suite is verified by running it twice in succession and confirming the
sandbox holds zero issues afterwards, and by running it with a deliberately
broken token to confirm every test fails loudly rather than silently skipping.

## Out of scope

- Any fake or recorded Jira backend. The decision is live-only.
- Creating boards, sprints or projects; these are treated as pre-existing.
- Windows and macOS CI runners. Nightly runs on `ubuntu-latest` only.
- Coverage thresholds. The e2e suite is excluded from `c8`.
