/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('auth:test', () => {
  let AuthTest: any
  let mockFs: any
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

    mockFs = {
      readJSON: async () => ({
        profiles: {
          default: {
            apiToken: 'test-token',
            email: 'test@example.com',
            host: 'https://test.atlassian.net',
          },
        },
      }),
    }

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
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        testConnection: mockTestConnection,
      },
      '@oclif/core/ux': {action: mockAction},
      'fs-extra': {default: mockFs},
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
    expect(logOutput).to.include('Successful connection to Jira')
  })

  it('uses correct profile when --profile flag is given', async () => {
    let receivedAuth: any

    mockFs = {
      readJSON: async () => ({
        profiles: {
          default: {apiToken: 'default-token', host: 'https://default.atlassian.net'},
          work: {apiToken: 'work-token', email: 'work@example.com', host: 'https://work.atlassian.net'},
        },
      }),
    }

    mockTestConnection = async (auth: any) => {
      receivedAuth = auth
      return {data: {}, success: true}
    }

    AuthTest = await esmock('../../../../src/commands/jira/auth/test.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        testConnection: mockTestConnection,
      },
      '@oclif/core/ux': {action: mockAction},
      'fs-extra': {default: mockFs},
    })

    const command = new AuthTest.default(['--profile', 'work'], createMockConfig())
    command.log = () => {}

    await command.run()

    expect(receivedAuth.apiToken).to.equal('work-token')
  })

  it('throws error when config is not available', async () => {
    mockFs = {
      readJSON: async () => {
        const err: any = new Error('ENOENT: no such file or directory')
        err.code = 'ENOENT'
        throw err
      },
    }

    AuthTest = await esmock('../../../../src/commands/jira/auth/test.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        testConnection: mockTestConnection,
      },
      '@oclif/core/ux': {action: mockAction},
      'fs-extra': {default: mockFs},
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

    expect(errorOutput).to.include('Missing authentication config')
  })

  it('handles connection failure gracefully', async () => {
    mockTestConnection = async () => ({
      error: 'Authentication failed',
      success: false,
    })

    AuthTest = await esmock('../../../../src/commands/jira/auth/test.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        testConnection: mockTestConnection,
      },
      '@oclif/core/ux': {action: mockAction},
      'fs-extra': {default: mockFs},
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
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        testConnection: mockTestConnection,
      },
      '@oclif/core/ux': {action: mockAction},
      'fs-extra': {default: mockFs},
    })

    const command = new AuthTest.default([], createMockConfig())
    command.log = () => {}

    await command.run()

    expect(clearClientsCalled).to.be.true
  })

  it('does not call testConnection when config is missing', async () => {
    mockFs = {
      readJSON: async () => {
        const err: any = new Error('ENOENT: no such file or directory')
        err.code = 'ENOENT'
        throw err
      },
    }

    let testConnectionCalled = false

    mockTestConnection = async () => {
      testConnectionCalled = true
      return {data: {}, success: true}
    }

    AuthTest = await esmock('../../../../src/commands/jira/auth/test.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        testConnection: mockTestConnection,
      },
      '@oclif/core/ux': {action: mockAction},
      'fs-extra': {default: mockFs},
    })

    const command = new AuthTest.default([], createMockConfig())
    command.error = () => {
      throw new Error('missing config')
    }

    try {
      await command.run()
    } catch {
      // Expected
    }

    expect(testConnectionCalled).to.be.false
  })
})
