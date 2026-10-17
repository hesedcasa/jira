import {Command, type Interfaces} from '@oclif/core'

export abstract class BaseCommand extends Command {
  public override jsonEnabled(): boolean {
    const separatorIndex = this.argv.indexOf('--')
    const flagArgs = separatorIndex === -1 ? this.argv : this.argv.slice(0, separatorIndex)
    return !flagArgs.includes('--toon')
  }

  // oclif sets this.parsed=true only after Parser.parse() returns successfully.
  // When parse() throws (e.g. missing required arg), this.parsed stays false and
  // _run() emits an UnparsedCommand warning. The finally block prevents that.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected override async parse(options?: any, argv?: string[]): Promise<any> {
    try {
      return await super.parse(options, argv)
    } finally {
      this.parsed = true
    }
  }

  // oclif's default toErrorJson returns the raw error object which for
  // CLIParseError includes context:this (the full config). Strip it down.
  protected override toErrorJson(err: unknown): {error: string} {
    const message = err instanceof Error ? err.message : String(err)
    return {error: message}
  }

  // In JSON mode oclif's catch() prints the error and returns, leaving the
  // exit code to whichever @oclif/core copy the command was resolved against:
  // 5.1.2 (the lockfile pin, so the standalone leg) exits 1, while 5.1.8+
  // promotes this.error()'s CLIError — err.oclif.exit, which defaults to 2 —
  // into process.exitCode. A plugin host resolves its own copy, so the same
  // failure exited 1 standalone and 2 under sdkck. Pin the documented
  // contract: a failed command exits 1. An explicit this.exit(n) (ExitError,
  // code EEXIT) keeps its own code.
  protected override async catch(err: Interfaces.CommandError): Promise<unknown> {
    const result = await super.catch(err)
    // ExitError carries code 'EEXIT' at runtime, though the CommandError type
    // does not declare it.
    if ((err as {code?: string}).code !== 'EEXIT') {
      process.exitCode = 1
    }

    return result
  }

  // Commands never throw on an API failure — the API layer catches and returns
  // {success: false} instead (see CLAUDE.md's ApiResult contract), so oclif's own
  // catch()-based exitCode logic never fires. Without this, a failed request looks
  // like a success to any script checking $?.
  protected override async _run<T>(): Promise<T> {
    const result = await super._run<T>()
    if (
      result !== null &&
      typeof result === 'object' &&
      'success' in result &&
      result.success === false &&
      (process.exitCode === undefined || process.exitCode === 0)
    ) {
      process.exitCode = 1
    }

    return result
  }
}
