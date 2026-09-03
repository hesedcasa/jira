# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**@hesed/jira** is an Oclif CLI for the Jira REST API (Cloud) and the Jira Agile API — issues, projects, boards, sprints, comments, attachments, worklogs, and development (PR/branch) info.

It ships both as a standalone binary (`jira`) and as an oclif **plugin** for a host CLI (`sdkck plugins install @hesed/jira`), which is why every command is nested under the `jira` topic — standalone invocation reads as `jira jira issue PROJ-123`, and under the host as `sdkck jira issue PROJ-123`.

Node >=22.19.0, ESM only, TypeScript `Node16` module resolution (so **all relative imports need the `.js` extension**).

## Development Commands

```bash
npm run build            # shx rm -rf dist + tsc -b
npm test                 # mocha over test/**/*.test.ts (posttest runs lint)
npx mocha test/commands/jira/issue/get.test.ts   # single test file
npm run test:coverage    # c8; thresholds are 50% lines/functions/branches/statements
npm run lint             # eslint
npm run format           # eslint --fix + prettier --write
npm run find-deadcode    # ts-prune --ignore '(run|default)'
npm run pre-commit       # format + find-deadcode (what the hook runs)

./bin/dev.js jira issue PROJ-123   # run from TypeScript source, no build
./bin/run.js jira issue PROJ-123   # run the built dist/
```

## Architecture

```text
src/
├── base-command.ts   # BaseCommand — output mode + oclif parse/error workarounds
├── commands/jira/    # Oclif commands: auth, board, issue, project, user
├── jira/
│   ├── jira-api.ts       # JiraApi — Jira Cloud REST calls
│   └── jira-client.ts    # thin per-operation wrappers over a shared client
├── agile/
│   ├── agile-api.ts      # AgileApi — board/sprint/version calls
│   └── agile-client.ts
├── markdown.ts       # Markdown → ADF, with hard-break preprocessing
├── proxy.ts          # global undici dispatcher so fetch honours HTTP(S)_PROXY
└── utils.ts          # defaultFields, processIssueRenderedAndFields
```

### `@hesed/plugin-lib` owns the cross-cutting plumbing

There is no `src/config.ts` and no `src/format.ts` — config, profiles, TOON formatting, the client singleton and the whole `auth` command family come from `@hesed/plugin-lib`:

- `createProfileManager(this.config, flags.profile, 'jira-config.json')` → `loadAuthConfig()`, `readProfiles()`, `getDefaultProfile()`, …
- `createApiClient(serviceName, factory)` → `{clearClients, getClient}`, the singleton used by both `*-client.ts` files
- `formatAsToon(data)`, `buildAuthHeader(config)`, the `ApiResult` / `AuthConfig` types
- `createAuthAddCommand` / `…List` / `…Profile` / `…Test` / `…Delete` / `…Update` — each `src/commands/jira/auth/*.ts` is just a factory call passing `configFile: 'jira-config.json'` plus this repo's `testConnection`/`clearClients`

When changing behaviour that looks like it belongs to config or formatting, check whether it actually lives in `node_modules/@hesed/plugin-lib` first.

### Three tiers

**Command** (parses args/flags, loads auth, returns the result) → **client** (`*-client.ts`, one exported function per operation, grabs the singleton via `getClient`) → **API** (`*-api.ts`, the `jira.js` / raw `fetch` calls).

Every API and client function returns `ApiResult`:

```typescript
type ApiResult = {data?: unknown; error?: unknown; success: boolean}
```

Errors are caught inside the API layer and returned as `{error: message, success: false}` — they are not thrown at the command.

### Output: return, don't log

`BaseCommand.jsonEnabled()` returns `true` unless `--toon` appears in argv (before any `--` separator). So a command's `run()` **returns** the `ApiResult` and oclif prints it as JSON; the only explicit logging is the TOON branch. Never call `this.logJson(result)` — that would double-print.

`BaseCommand` also carries two oclif workarounds worth knowing before touching it: it forces `this.parsed = true` in a `finally` so a failed parse doesn't emit an `UnparsedCommand` warning, and it overrides `toErrorJson` so a `CLIParseError` doesn't serialize the entire Config.

### jira.js v6 / proxy

jira.js v6 dropped axios for `fetch`, so there is no per-client agent. `configureFetchProxy(host)` (called from the API layer) installs an undici `EnvHttpProxyAgent` as the **global dispatcher** when `proxy-from-env` says the host is proxied — that is the only thing making `HTTP(S)_PROXY`/`NO_PROXY` work, and it covers the plain `fetch` calls too (attachment download, the dev-status endpoint, which use `createClient` from `jira.js/core` with `buildAuthHeader`).

### Issue field processing

`processIssueRenderedAndFields(issue)` is called on every issue returned. It converts `renderedFields` HTML to Markdown with `turndown` (description and each comment body), drops empty `customfield_*` entries, merges `renderedFields` over `fields`, then empties `renderedFields`. `defaultFields` is the base field list for issue queries.

### Markdown → ADF

`markdownToAdfDocument()` in `src/markdown.ts` wraps `marklassian`. Two things it does that plain `markdownToAdf` does not: it unescapes literal `\n` sequences (users type them inside one shell argument), and it lexes with `marked` to insert **explicit hard breaks** in paragraphs/blockquotes/list items only, so single newlines survive instead of collapsing — code blocks, tables and headings keep their raw text. Any change here needs to keep that lex-first discipline.

## Adding a New Command

Create `src/commands/jira/<topic>/<name>.ts` (`index.ts` is the bare topic command, e.g. `jira issue ISSUEID`). Follow `src/commands/jira/issue/index.ts`:

```typescript
import {type ApiResult, createProfileManager, formatAsToon} from '@hesed/plugin-lib'
import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../../base-command.js'
import {clearClients, getIssue} from '../../../jira/jira-client.js'

export default class IssueGet extends BaseCommand {
  static override args = {
    issueId: Args.string({description: 'Issue ID or issue key', required: true}),
  }

  static override description = 'Get details of a specific issue'
  static override examples = ['<%= config.bin %> <%= command.id %> PROJ-123']
  static override flags = {
    profile: Flags.string({char: 'p', description: 'Authentication profile name', required: false}),
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<ApiResult> {
    const {args, flags} = await this.parse(IssueGet)
    const {loadAuthConfig} = createProfileManager(this.config, flags.profile, 'jira-config.json')
    const auth = await loadAuthConfig()
    if (!auth) {
      this.error(`Missing authentication config.`)
    }

    const result = await getIssue(auth, args.issueId)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    }

    return result
  }
}
```

Non-negotiable bits: extend `BaseCommand` (not `Command`), always offer `--profile/-p`, always `clearClients()` after the call, `this.error()` on missing auth, and return the `ApiResult`.

**Argument ordering:** `issueId` is always the first positional arg. `eslint-config-oclif` enforces `perfectionist/sort-objects`, so when issue-first conflicts with alphabetical, wrap the block:

```typescript
/* eslint-disable perfectionist/sort-objects -- issueId must be first arg per CLAUDE.md convention */
static override args = {
  issueId: Args.string({description: 'Issue ID or issue key', required: true}),
  body: Args.string({description: 'Comment text content', required: true}),
}
/* eslint-enable perfectionist/sort-objects */
```

## Adding New API Functions

1. Add the method to `JiraApi` / `AgileApi`, wrapping the body in try/catch and returning `ApiResult`.
2. Export a wrapper in the matching `*-client.ts` that does `const jira = await getClient(config)` then delegates.
3. Client wrappers taking more than four params need `// eslint-disable-next-line max-params` (the existing paginated ones show the shape).
4. If the method returns issues, run `processIssueRenderedAndFields` over each one.

## Configuration

`~/.config/jira/jira-config.json` (path is `this.config.configDir`, platform-dependent; under a host CLI it is the host's config dir). Multi-profile format:

```json
{
  "defaultProfile": "work",
  "profiles": {
    "work": {"email": "user@example.com", "apiToken": "token", "host": "https://your-domain.atlassian.net"}
  }
}
```

The legacy single `{"auth": {...}}` shape is still read and surfaces as the `default` profile. Values pass through plugin-lib's `resolveSecrets`, so an `apiToken` may be a Vault or Infisical reference rather than a literal. Manage all of this with `jira auth add|update|list|profile|delete|test` — don't hand-edit or write config from command code.

**Nothing in this repo loads `.env`** — there is no dotenv dependency, so the variables must already be in the process environment. Export them before running any command that talks to Jira:

```bash
set -a; . ./.env; set +a
./bin/dev.js jira auth test
```

## Testing

- Mocha + Chai + `esmock`, `ts-node/esm` loader (`.mocharc.json`), 60s timeout. Tests mirror `src/` under `test/`.
- Mock **both** the client module and `@hesed/plugin-lib` (stub `createProfileManager` to return a `loadAuthConfig` yielding fake auth) — see `test/commands/jira/issue/get.test.ts`.
- Instantiate with `new Cmd.default([...argv], createMockConfig())` from `test/helpers/config-mock.ts`, then assert on the value `run()` returns; for `--toon`, assert on captured `log` output.
- **Positional arg order in the array must match the `static args` declaration order**, since oclif assigns by position:
  ```typescript
  // args = { issueId, id, body }
  new IssueUpdateComment.default(['TEST-123', '10001', 'Updated text'], createMockConfig())
  ```
- `/* eslint-disable max-params */` at the top of a test file when mocked functions take more than four params. `eslint.config.mjs` already relaxes the type-checked and several style rules for `test/**`.

## Release & CI

- Conventional Commits are **enforced on PR titles** by `.github/workflows/convetional-commit.yml`. Use `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:` for commits and PR titles alike.
- `release-please` opens the version PR on merge to `main`; pushing a `jira-v*` tag triggers the npm publish workflow (OIDC, no stored token).
- `prepack` regenerates `oclif.manifest.json` and the README command reference — the `<!-- commands -->` block in `README.md` is generated, so edit command `description`/`examples` in the source, never the README.
