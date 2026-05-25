/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('auth:list', () => {
  let AuthList: any
  let mockFs: any
  let logOutput: string[]

  beforeEach(async () => {
    logOutput = []

    mockFs = {
      readJSON: async () => ({
        profiles: {
          default: {
            apiToken: 'default-token-value',
            email: 'default@example.com',
            host: 'https://default.atlassian.net',
          },
          work: {
            apiToken: 'work-token-value',
            host: 'https://work.atlassian.net',
          },
        },
      }),
    }

    AuthList = await esmock('../../../../src/commands/jira/auth/list.js', {
      'fs-extra': {default: mockFs},
    })
  })

  it('lists all profiles with default marker', async () => {
    const command = new AuthList.default([], createMockConfig())

    command.log = (output: string) => {
      logOutput.push(output)
    }

    const result = await command.run()

    expect(result.profiles).to.have.length(2)
    const defaultProfile = result.profiles.find((p: any) => p.name === 'default')
    const workProfile = result.profiles.find((p: any) => p.name === 'work')

    expect(defaultProfile.default).to.be.true
    expect(workProfile.default).to.be.undefined
    expect(logOutput[0]).to.include('default (default):')
    expect(logOutput[0]).to.include('https://default.atlassian.net')
  })

  it('masks api tokens', async () => {
    const command = new AuthList.default([], createMockConfig())

    command.log = () => {}

    const result = await command.run()

    expect(result.profiles[0].apiToken).to.equal('def...alue')
  })

  it('shows message when no profiles exist', async () => {
    mockFs = {
      readJSON: async () => {
        const err: any = new Error('ENOENT: no such file or directory')
        err.code = 'ENOENT'
        throw err
      },
    }

    AuthList = await esmock('../../../../src/commands/jira/auth/list.js', {
      'fs-extra': {default: mockFs},
    })

    const command = new AuthList.default([], createMockConfig())

    command.log = (output: string) => {
      logOutput.push(output)
    }

    const result = await command.run()

    expect(result.profiles).to.have.length(0)
    expect(logOutput[0]).to.include('No authentication profiles found')
  })

  it('returns empty profiles when readProfiles returns empty object', async () => {
    mockFs = {
      readJSON: async () => ({}),
    }

    AuthList = await esmock('../../../../src/commands/jira/auth/list.js', {
      'fs-extra': {default: mockFs},
    })

    const command = new AuthList.default([], createMockConfig())

    command.log = (output: string) => {
      logOutput.push(output)
    }

    const result = await command.run()

    expect(result.profiles).to.have.length(0)
    expect(logOutput[0]).to.include('No authentication profiles found')
  })
})
