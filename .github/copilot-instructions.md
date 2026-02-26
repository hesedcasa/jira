# GitHub Copilot Instructions

This file provides guidance to GitHub Copilot when working with code in this repository.

## Project Overview

**jira** is an Oclif-based CLI tool for interacting with Jira REST API and Jira Agile API. It provides comprehensive access to Jira functionality including issues, projects, boards, sprints, comments, attachments, and worklogs.

**Tech Stack:**

- TypeScript with ES modules
- Oclif v4 CLI framework
- jira.js v5 for Jira API interaction
- Mocha + Chai for testing
- Node.js >=18.0.0

## Development Commands

```bash
# Build the project
npm run build

# Run all tests
npm test

# Run a single test file
npx mocha test/path/to/test.test.ts

# Lint code
npm run lint

# Format code
npm run format

# Find dead code
npm run find-deadcode

# Pre-commit checks
npm run pre-commit
```

## Architecture

The project follows a three-tier layered architecture with clear separation of concerns:

```
src/
├── commands/         # Oclif CLI commands (user-facing)
├── jira/            # Jira REST API layer
│   ├── jira-api.ts      # JiraApi class with core API methods
│   └── jira-client.ts   # Wrapper functions with singleton pattern
├── agile/           # Jira Agile API layer
│   ├── agile-api.ts     # AgileApi class for board/sprint operations
│   └── agile-client.ts  # Wrapper functions with singleton pattern
├── config.ts        # Configuration management (auth config)
├── format.ts        # Output formatting (TOON format)
└── utils.ts         # Shared utilities (issue processing, defaults)
```

### Key Architectural Patterns

**1. Three-Tier Command Pattern:**

- **Commands** (`src/commands/`) - Thin Oclif command wrappers that parse args/flags
- **Client Layer** (`*-client.ts`) - Functional wrappers with singleton pattern
- **API Layer** (`*-api.ts`) - Core API classes using `jira.js` library

**2. ApiResult Pattern:**
All API functions return `ApiResult<T>` objects:

```typescript
interface ApiResult {
  data?: unknown
  error?: unknown
  success: boolean
}
```

**3. Singleton Client Pattern:**
Both `jira-client.ts` and `agile-client.ts` maintain singleton instances of their respective API classes. Commands should call `clearClients()` after use for cleanup.

**4. Markdown to ADF Conversion:**
The project uses `marklassian` to convert Markdown to Jira's Atlassian Document Format (ADF) for comments and descriptions. Commands accept Markdown input which is automatically converted.

## Code Style and Standards

### TypeScript

- Use ES modules with `.js` extensions in imports (even for TypeScript files)
- Enable strict type checking
- Prefer explicit return types on public methods
- Use interfaces for data structures

### Command Structure

When adding a new command, follow this pattern:

```typescript
import {Args, Command, Flags} from '@oclif/core'
import {readConfig} from '../../config.js'
import {formatAsToon} from '../../format.js'
import {clearClients, getIssue} from '../../jira/jira-client.js'

export default class IssueGet extends Command {
  static override args = {
    issueId: Args.string({description: 'Issue ID or issue key', required: true}),
  }
  static override description = 'Get details of a specific issue'
  static override examples = ['<%= config.bin %> <%= command.id %> PROJ-123']
  static override flags = {
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(IssueGet)
    const config = await readConfig(this.config.configDir, this.log)
    if (!config) return

    const result = await getIssue(config.auth, args.issueId)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
```

### Adding New Commands

1. Create command file in `src/commands/<category>/<name>.ts`
2. Extend `Command` from `@oclif/core`
3. Define static `args`, `flags`, `description`, and `examples`
4. In `run()` method:
   - Parse args/flags
   - Read config with `readConfig(this.config.configDir, this.log)`
   - Call appropriate client function from `jira-client.ts` or `agile-client.ts`
   - Call `clearClients()` for cleanup
   - Output with `this.logJson(result)` or `this.log(formatAsToon(result))`

### Adding New API Functions

1. Add method to `JiraApi` or `AgileApi` class in `*-api.ts`
2. Export wrapper function in corresponding `*-client.ts` with `initJira` pattern
3. Use `ApiResult` return type for consistent error handling

## Testing

- Tests mirror source structure in `test/` directory
- Use Mocha + Chai for testing
- Use `esmock` for mocking dependencies
- Tests use `ts-node` for TypeScript execution (see `.mocharc.json`)
- 60-second timeout for all tests
- Run `npm test` before submitting changes

## Dependencies

- **jira.js** v5 - Jira API client library
- **@oclif/core** - CLI framework
- **marklassian** - Markdown to ADF conversion
- **@toon-format/toon** - TOON output format
- **@inquirer/prompts** - Interactive prompts

## Important Notes

- All command files use ES modules (`.js` extensions in imports)
- Pre-commit hook runs format and dead code detection
- Uses `shx` for cross-platform shell commands
- Node.js >=18.0.0 required
- Published as npm package `jira`

## Configuration

Authentication config is stored in JSON at `~/.config/jira/jira-config.json` (platform-dependent):

```json
{
  "auth": {
    "email": "user@example.com",
    "apiToken": "token",
    "host": "https://your-domain.atlassian.net"
  }
}
```

## Commit Message Convention

**Always use Conventional Commits format** for all commit messages and PR titles:

- `feat:` - New features or capabilities
- `fix:` - Bug fixes
- `docs:` - Documentation changes only
- `refactor:` - Code refactoring without changing functionality
- `test:` - Adding or modifying tests
- `chore:` - Maintenance tasks, dependency updates, build configuration

**Examples:**

```
feat: add list-boards command for agile boards
fix: handle connection timeout errors gracefully
docs: update configuration examples in README
refactor: extract API formatting into separate module
test: add integration tests for Jira operations
chore: update jira.js to latest version
```

## Boundaries and Restrictions

- Never commit secrets, API tokens, or credentials to source code
- Never modify `node_modules/` or build artifacts in `dist/`
- Never bypass the three-tier architecture pattern
- Always run tests before committing changes
- Always call `clearClients()` in command cleanup
- Always use the `ApiResult` pattern for error handling
- Always use Markdown for input that will be converted to ADF

## Output Formatting

- Default: JSON via `this.logJson()`
- TOON format: Custom token-oriented format via `formatAsToon()` (using `@toon-format/toon`)
- Use `--toon` flag to enable TOON output in commands
