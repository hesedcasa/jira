/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('auth:profile', () => {
  let AuthProfile: any
  let mockFs: any
  let logOutput: string[]

  beforeEach(async () => {
    logOutput = []

    mockFs = {
      outputJSON: async () => {},
      readJSON: async () => ({
        defaultProfile: 'default',
        profiles: {
          default: {apiToken: 'default-token', host: 'https://default.atlassian.net'},
          work: {apiToken: 'work-token', host: 'https://work.atlassian.net'},
        },
      }),
    }

    AuthProfile = await esmock('../../../../src/commands/jira/auth/profile.js', {
      'fs-extra': {default: mockFs},
    })
  })

  it('shows current default profile when no flag given', async () => {
    const command = new AuthProfile.default([], createMockConfig())

    command.log = (output: string) => {
      logOutput.push(output)
    }

    await command.run()

    expect(logOutput).to.include('default')
  })

  it('sets default profile with --default flag', async () => {
    let writtenData: any = null

    mockFs = {
      ...mockFs,
      outputJSON: async (_path: string, data: any) => {
        writtenData = data
      },
    }

    AuthProfile = await esmock('../../../../src/commands/jira/auth/profile.js', {
      'fs-extra': {default: mockFs},
    })

    const command = new AuthProfile.default(['--default', 'work'], createMockConfig())

    command.log = (output: string) => {
      logOutput.push(output)
    }

    await command.run()

    expect(writtenData.defaultProfile).to.equal('work')
    expect(logOutput).to.include("Default profile set to 'work'")
  })

  it('does not call outputJSON when showing default profile', async () => {
    let outputJSONCalled = false

    mockFs = {
      ...mockFs,
      outputJSON: async () => {
        outputJSONCalled = true
      },
    }

    AuthProfile = await esmock('../../../../src/commands/jira/auth/profile.js', {
      'fs-extra': {default: mockFs},
    })

    const command = new AuthProfile.default([], createMockConfig())
    command.log = () => {}

    await command.run()

    expect(outputJSONCalled).to.be.false
  })
})
