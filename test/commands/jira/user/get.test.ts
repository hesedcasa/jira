/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('user:get', () => {
  let UserGet: any
  let mockReadConfig: any
  let mockGetUser: any
  let mockClearClients: any
  let jsonOutput: any
  let logOutput: string[]

  beforeEach(async () => {
    jsonOutput = null
    logOutput = []

    mockReadConfig = async () => ({
      auth: {
        apiToken: 'test-token',
        email: 'test@example.com',
        host: 'https://test.atlassian.net',
      },
    })

    mockGetUser = async () => ({
      data: {
        accountId: '5b10ac8d82e05b22cc7d4ef5',
        displayName: 'John Doe',
        emailAddress: 'john@example.com',
      },
      success: true,
    })

    mockClearClients = () => {}

    UserGet = await esmock('../../../../src/commands/jira/user/get.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getUser: mockGetUser,
      },
    })
  })

  it('gets user by account ID', async () => {
    const command = new UserGet.default(['5b10ac8d82e05b22cc7d4ef5'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
    expect(jsonOutput.data.accountId).to.equal('5b10ac8d82e05b22cc7d4ef5')
  })

  it('gets user without account ID', async () => {
    const command = new UserGet.default([], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
  })

  it('respects --query flag for searching users', async () => {
    const command = new UserGet.default(['--query', 'john'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
  })

  it('respects -q shorthand flag for query', async () => {
    const command = new UserGet.default(['-q', 'john@example.com'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
  })

  it('formats output as TOON when --toon flag is provided', async () => {
    const command = new UserGet.default(['5b10ac8d82e05b22cc7d4ef5', '--toon'], createMockConfig())

    command.log = (output: string) => {
      logOutput.push(output)
    }

    await command.run()

    expect(logOutput.length).to.be.greaterThan(0)
  })

  it('handles API errors gracefully', async () => {
    mockGetUser = async () => ({
      error: 'User not found',
      success: false,
    })

    UserGet = await esmock('../../../../src/commands/jira/user/get.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getUser: mockGetUser,
      },
    })

    const command = new UserGet.default(['invalid-id'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput.success).to.be.false
    expect(jsonOutput.error).to.include('User not found')
  })

  it('exits early when config is not available', async () => {
    mockReadConfig = async () => null

    UserGet = await esmock('../../../../src/commands/jira/user/get.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getUser: mockGetUser,
      },
    })

    const command = new UserGet.default(['5b10ac8d82e05b22cc7d4ef5'], createMockConfig())

    let getUserCalled = false
    mockGetUser = async () => {
      getUserCalled = true
      return {data: {}, success: true}
    }

    await command.run()

    expect(getUserCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    UserGet = await esmock('../../../../src/commands/jira/user/get.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getUser: mockGetUser,
      },
    })

    const command = new UserGet.default(['5b10ac8d82e05b22cc7d4ef5'], createMockConfig())
    command.logJson = () => {}

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
