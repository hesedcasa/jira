import {type Config} from '@oclif/core'
import {expect} from 'chai'
import esmock from 'esmock'

import {BaseCommand} from '../src/base-command.js'

describe('BaseCommand', () => {
  let originalExitCode: NodeJS.Process['exitCode']

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  async function runWithResult(result: unknown): Promise<void> {
    const {BaseCommand: MockedBaseCommand} = await esmock('../src/base-command.js', {
      '@oclif/core': {
        Command: class {
          protected async _run(): Promise<unknown> {
            return result
          }
        },
      },
    })

    class TestCommand extends MockedBaseCommand {
      public execute(): Promise<unknown> {
        return this._run()
      }

      public async run(): Promise<unknown> {
        return undefined
      }
    }

    await new TestCommand().execute()
  }

  async function runWithThrown(thrown: unknown): Promise<void> {
    const {BaseCommand: MockedBaseCommand} = await esmock('../src/base-command.js', {
      '@oclif/core': {
        Command: class {
          protected async _run(): Promise<unknown> {
            try {
              return await this.run()
            } catch (error_: unknown) {
              await this.catch(error_)
              return undefined
            }
          }

          // Mimics @oclif/core 5.1.8's catch, which promotes err.oclif.exit
          // into process.exitCode before JSON mode prints the error and
          // returns; 5.1.2 (the repo pin) reads only err.exitCode here.
          protected async catch(err: unknown): Promise<unknown> {
            const typed = err as {exitCode?: number; oclif?: {exit?: number}}
            process.exitCode ??= typed.oclif?.exit ?? typed.exitCode ?? 1
            return undefined
          }

          public run(): Promise<never> {
            throw thrown
          }
        },
      },
    })

    class TestCommand extends MockedBaseCommand {
      public execute(): Promise<unknown> {
        return this._run()
      }
    }

    await new TestCommand().execute()
  }

  // Runs the command through the real, lockfile-pinned @oclif/core 5.1.2
  // superclass (no esmock), so the override is exercised against the catch()
  // the standalone leg actually resolves. The config only needs what _run's
  // init touches; the JSON-mode error print goes through console.log.
  async function runPinnedOclif(command_: (command: BaseCommand) => void): Promise<void> {
    class TestCommand extends BaseCommand {
      public execute(): Promise<unknown> {
        return this._run()
      }

      public async run(): Promise<unknown> {
        this.parsed = true
        command_(this)
        return undefined
      }
    }

    const config = {
      bin: 'jira',
      scopedEnvVarKeys: () => [],
    } as unknown as Config

    const originalLog = console.log
    console.log = () => {}
    try {
      await new TestCommand([], config).execute()
    } finally {
      console.log = originalLog
    }
  }

  for (const exitCode of [undefined, 0]) {
    it(`sets exitCode to 1 when an API failure starts with ${String(exitCode)}`, async () => {
      process.exitCode = exitCode

      await runWithResult({success: false})

      expect(process.exitCode).to.equal(1)
    })
  }

  it('preserves an existing non-zero exitCode on API failure', async () => {
    process.exitCode = 2

    await runWithResult({success: false})

    expect(process.exitCode).to.equal(2)
  })

  it('pins exitCode to 1 when the resolved oclif catch promotes the CLIError exit', async () => {
    process.exitCode = undefined

    await runWithThrown(Object.assign(new Error('Missing authentication config.'), {oclif: {exit: 2}}))

    expect(process.exitCode).to.equal(1)
  })

  it('keeps the exit code of an explicit this.exit() (ExitError)', async () => {
    process.exitCode = undefined

    await runWithThrown(Object.assign(new Error('EEXIT: 7'), {code: 'EEXIT', oclif: {exit: 7}}))

    expect(process.exitCode).to.equal(7)
  })

  it('keeps the exit code of a real this.exit() under the pinned @oclif/core superclass', async () => {
    process.exitCode = undefined

    await runPinnedOclif((command: BaseCommand) => {
      command.exit(7)
    })

    expect(process.exitCode).to.equal(7)
  })

  it('pins exitCode to 1 for a real CLIError under the pinned @oclif/core superclass', async () => {
    process.exitCode = undefined

    await runPinnedOclif((command: BaseCommand) => {
      command.error('Missing authentication config.', {exit: 2})
    })

    expect(process.exitCode).to.equal(1)
  })
})
