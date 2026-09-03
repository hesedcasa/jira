import {expect} from 'chai'
import esmock from 'esmock'

describe('BaseCommand', () => {
  let originalExitCode: NodeJS.Process['exitCode']

  beforeEach(() => {
    originalExitCode = process.exitCode
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  async function runWithResult(result: unknown): Promise<void> {
    const {BaseCommand} = await esmock('../src/base-command.js', {
      '@oclif/core': {
        Command: class {
          protected async _run(): Promise<unknown> {
            return result
          }
        },
      },
    })

    class TestCommand extends BaseCommand {
      public execute(): Promise<unknown> {
        return this._run()
      }

      public async run(): Promise<unknown> {
        return undefined
      }
    }

    await new TestCommand().execute()
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
})
