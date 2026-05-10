/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('auth:test', () => {
  let AuthTest: any
  let mockReadConfig: any
  let mockTestConnection: any
  let mockClearClients: any
  let mockAction: any
  let logOutput: string[]
  let errorOutput: null | string
  let actionStarted: null | string
  let actionStopped: null | string

  beforeEach(async () => {
    logOutput = []
    errorOutput = null
    actionStarted = null
    actionStopped = null

    mockReadConfig = async () => ({
      auth: {
        apiToken: 'test-token',
        email: 'test@example.com',
        host: 'https://test.atlassian.net',
      },
    })

    mockTestConnection = async () => ({
      data: {serverInfo: {version: '8.0.0'}},
      success: true,
    })

    mockClearClients = () => {}

    mockAction = {
      start(message: string) {
        actionStarted = message
      },
      stop(message: string) {
        actionStopped = message
      },
    }

    AuthTest = await esmock('../../../../src/commands/jira/auth/test.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        testConnection: mockTestConnection,
      },
      '@oclif/core/ux': {action: mockAction},
    })
  })

  it('successfully tests connection with valid config', async () => {
    const command = new AuthTest.default([], createMockConfig())

    command.log = (output: string) => {
      logOutput.push(output)
    }

    const result = await command.run()

    expect(result.success).to.be.true
    expect(actionStarted).to.equal('Authenticating connection')
    expect(actionStopped).to.equal('✓ successful')
    expect(logOutput).to.include('Successful connect to Jira')
  })

  it('passes profile flag to readConfig', async () => {
    let receivedProfile: string | undefined

    mockReadConfig = async (_dir: string, _log: any, profile?: string) => {
      receivedProfile = profile
      return {
        auth: {
          apiToken: 'work-token',
          email: 'work@example.com',
          host: 'https://work.atlassian.net',
        },
      }
    }

    AuthTest = await esmock('../../../../src/commands/jira/auth/test.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        testConnection: mockTestConnection,
      },
      '@oclif/core/ux': {action: mockAction},
    })

    const command = new AuthTest.default(['--profile', 'work'], createMockConfig())

    command.log = () => {}

    await command.run()

    expect(receivedProfile).to.equal('work')
  })

  it('returns error when config is not available', async () => {
    mockReadConfig = async () => null

    AuthTest = await esmock('../../../../src/commands/jira/auth/test.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        testConnection: mockTestConnection,
      },
      '@oclif/core/ux': {action: mockAction},
    })

    const command = new AuthTest.default([], createMockConfig())

    const result = await command.run()

    expect(result.success).to.be.false
    expect(result.error).to.equal('Missing authentication config')
  })

  it('handles connection failure gracefully', async () => {
    mockTestConnection = async () => ({
      error: 'Authentication failed',
      success: false,
    })

    AuthTest = await esmock('../../../../src/commands/jira/auth/test.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        testConnection: mockTestConnection,
      },
      '@oclif/core/ux': {action: mockAction},
    })

    const command = new AuthTest.default([], createMockConfig())

    command.error = (message: string) => {
      errorOutput = message
      throw new Error(message)
    }

    try {
      await command.run()
    } catch {
      // Expected to throw
    }

    expect(actionStarted).to.equal('Authenticating connection')
    expect(actionStopped).to.equal('✗ failed')
    expect(errorOutput).to.include('Failed to connect to Jira')
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    AuthTest = await esmock('../../../../src/commands/jira/auth/test.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        testConnection: mockTestConnection,
      },
      '@oclif/core/ux': {action: mockAction},
    })

    const command = new AuthTest.default([], createMockConfig())
    command.log = () => {}

    await command.run()

    expect(clearClientsCalled).to.be.true
  })

  it('does not call testConnection when config is missing', async () => {
    mockReadConfig = async () => null
    let testConnectionCalled = false

    mockTestConnection = async () => {
      testConnectionCalled = true
      return {data: {}, success: true}
    }

    AuthTest = await esmock('../../../../src/commands/jira/auth/test.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        testConnection: mockTestConnection,
      },
      '@oclif/core/ux': {action: mockAction},
    })

    const command = new AuthTest.default([], createMockConfig())

    await command.run()

    expect(testConnectionCalled).to.be.false
  })
})
