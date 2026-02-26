/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('auth:update', () => {
  let AuthUpdate: any
  let mockFs: any
  let mockTestConnection: any
  let mockClearClients: any
  let mockAction: any
  let mockConfirm: any
  let logMessages: string[]

  beforeEach(async () => {
    logMessages = []

    mockFs = {
      async readJSON() {
        return {
          auth: {
            apiToken: 'old-token',
            email: 'old@example.com',
            host: 'https://old.atlassian.net',
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

    mockConfirm = async () => true

    AuthUpdate = await esmock('../../../../src/commands/jira/auth/update.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        testConnection: mockTestConnection,
      },
      '@inquirer/prompts': {
        confirm: mockConfirm,
      },
      '@oclif/core/ux': {
        action: mockAction,
      },
      'fs-extra': mockFs,
    })
  })

  it('updates authentication successfully with flags', async () => {
    const command = new AuthUpdate.default(
      ['--email', 'new@example.com', '--token', 'new-token', '--url', 'https://new.atlassian.net'],
      createMockConfig(),
    )

    command.log = (msg: string) => {
      logMessages.push(msg)
    }

    const result = await command.run()

    expect(result.success).to.be.true
    expect(logMessages).to.include('Authentication updated successfully')
  })

  it('handles authentication failure', async () => {
    mockTestConnection = async () => ({
      error: 'Invalid credentials',
      success: false,
    })

    AuthUpdate = await esmock('../../../../src/commands/jira/auth/update.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        testConnection: mockTestConnection,
      },
      '@inquirer/prompts': {
        confirm: mockConfirm,
      },
      '@oclif/core/ux': {
        action: mockAction,
      },
      'fs-extra': mockFs,
    })

    const command = new AuthUpdate.default(
      ['--email', 'new@example.com', '--token', 'bad-token', '--url', 'https://new.atlassian.net'],
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

  it('exits when config file does not exist', async () => {
    mockFs = {
      async readJSON() {
        const error: any = new Error('no such file or directory')
        error.message = 'no such file or directory'
        throw error
      },
    }

    AuthUpdate = await esmock('../../../../src/commands/jira/auth/update.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        testConnection: mockTestConnection,
      },
      '@inquirer/prompts': {
        confirm: mockConfirm,
      },
      '@oclif/core/ux': {
        action: mockAction,
      },
      'fs-extra': mockFs,
    })

    const command = new AuthUpdate.default(
      ['--email', 'new@example.com', '--token', 'new-token', '--url', 'https://new.atlassian.net'],
      createMockConfig(),
    )

    command.log = (msg: string) => {
      logMessages.push(msg)
    }

    await command.run()

    expect(logMessages).to.include('Run auth:add instead')
  })

  it('exits when user cancels confirmation', async () => {
    mockConfirm = async () => false

    AuthUpdate = await esmock('../../../../src/commands/jira/auth/update.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        testConnection: mockTestConnection,
      },
      '@inquirer/prompts': {
        confirm: mockConfirm,
      },
      '@oclif/core/ux': {
        action: mockAction,
      },
      'fs-extra': mockFs,
    })

    const command = new AuthUpdate.default(
      ['--email', 'new@example.com', '--token', 'new-token', '--url', 'https://new.atlassian.net'],
      createMockConfig(),
    )

    command.log = (msg: string) => {
      logMessages.push(msg)
    }

    const result = await command.run()

    expect(result).to.be.undefined
    expect(logMessages).to.not.include('Authentication updated successfully')
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    AuthUpdate = await esmock('../../../../src/commands/jira/auth/update.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        testConnection: mockTestConnection,
      },
      '@inquirer/prompts': {
        confirm: mockConfirm,
      },
      '@oclif/core/ux': {
        action: mockAction,
      },
      'fs-extra': mockFs,
    })

    const command = new AuthUpdate.default(
      ['--email', 'new@example.com', '--token', 'new-token', '--url', 'https://new.atlassian.net'],
      createMockConfig(),
    )

    command.log = () => {}

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
