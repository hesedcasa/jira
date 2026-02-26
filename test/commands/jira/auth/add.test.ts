/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('auth:add', () => {
  let AuthAdd: any
  let mockFs: any
  let mockTestConnection: any
  let mockClearClients: any
  let mockAction: any
  let logMessages: string[]

  beforeEach(async () => {
    logMessages = []

    mockFs = {
      async createFile() {},
      async pathExists() {
        return false
      },
      async readJSON() {
        return {
          auth: {
            apiToken: 'test-token',
            email: 'test@example.com',
            host: 'https://test.atlassian.net',
          },
        }
      },
      async writeJSON() {},
    }

    mockTestConnection = async () => ({
      data: {},
      success: true,
    })

    mockClearClients = () => {}

    mockAction = {
      start() {},
      stop() {},
    }

    AuthAdd = await esmock('../../../../src/commands/jira/auth/add.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        testConnection: mockTestConnection,
      },
      '@oclif/core/ux': {
        action: mockAction,
      },
      'fs-extra': mockFs,
    })
  })

  it('adds authentication successfully with flags', async () => {
    const command = new AuthAdd.default(
      ['--email', 'test@example.com', '--token', 'token123', '--url', 'https://test.atlassian.net'],
      createMockConfig(),
    )

    command.log = (msg: string) => {
      logMessages.push(msg)
    }

    const result = await command.run()

    expect(result.success).to.be.true
    expect(logMessages).to.include('Authentication added successfully')
  })

  it('handles authentication failure', async () => {
    mockTestConnection = async () => ({
      error: 'Invalid credentials',
      success: false,
    })

    AuthAdd = await esmock('../../../../src/commands/jira/auth/add.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        testConnection: mockTestConnection,
      },
      '@oclif/core/ux': {
        action: mockAction,
      },
      'fs-extra': mockFs,
    })

    const command = new AuthAdd.default(
      ['--email', 'test@example.com', '--token', 'bad-token', '--url', 'https://test.atlassian.net'],
      createMockConfig(),
    )

    command.log = (msg: string) => {
      logMessages.push(msg)
    }

    let errorThrown = false
    command.error = (msg: string) => {
      errorThrown = true
      expect(msg).to.include('Authentication is invalid')
    }

    await command.run()

    expect(errorThrown).to.be.true
  })

  it('creates config file if it does not exist', async () => {
    let createFileCalled = false

    mockFs = {
      ...mockFs,
      async createFile() {
        createFileCalled = true
      },
      async pathExists() {
        return false
      },
    }

    AuthAdd = await esmock('../../../../src/commands/jira/auth/add.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        testConnection: mockTestConnection,
      },
      '@oclif/core/ux': {
        action: mockAction,
      },
      'fs-extra': mockFs,
    })

    const command = new AuthAdd.default(
      ['--email', 'test@example.com', '--token', 'token123', '--url', 'https://test.atlassian.net'],
      createMockConfig(),
    )

    command.log = () => {}

    await command.run()

    expect(createFileCalled).to.be.true
  })

  it('does not create config file if it already exists', async () => {
    let createFileCalled = false

    mockFs = {
      ...mockFs,
      async createFile() {
        createFileCalled = true
      },
      async pathExists() {
        return true
      },
    }

    AuthAdd = await esmock('../../../../src/commands/jira/auth/add.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        testConnection: mockTestConnection,
      },
      '@oclif/core/ux': {
        action: mockAction,
      },
      'fs-extra': mockFs,
    })

    const command = new AuthAdd.default(
      ['--email', 'test@example.com', '--token', 'token123', '--url', 'https://test.atlassian.net'],
      createMockConfig(),
    )

    command.log = () => {}

    await command.run()

    expect(createFileCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    AuthAdd = await esmock('../../../../src/commands/jira/auth/add.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        testConnection: mockTestConnection,
      },
      '@oclif/core/ux': {
        action: mockAction,
      },
      'fs-extra': mockFs,
    })

    const command = new AuthAdd.default(
      ['--email', 'test@example.com', '--token', 'token123', '--url', 'https://test.atlassian.net'],
      createMockConfig(),
    )

    command.log = () => {}

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
