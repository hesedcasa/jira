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
      async readJSON() {
        throw new Error('ENOENT: no such file or directory')
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
      [
        '--email',
        'test@example.com',
        '--token',
        'token123',
        '--url',
        'https://test.atlassian.net',
        '--profile',
        'default',
      ],
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
      [
        '--email',
        'test@example.com',
        '--token',
        'bad-token',
        '--url',
        'https://test.atlassian.net',
        '--profile',
        'work',
      ],
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

  it('converts old-format auth to default profile before saving', async () => {
    let writtenData: any = null

    mockFs = {
      ...mockFs,
      async readJSON() {
        return {
          auth: {
            apiToken: 'test-token',
            email: 'test@example.com',
            host: 'https://test.atlassian.net',
          },
        }
      },
      async writeJSON(_path: string, data: any) {
        writtenData = data
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
      ['--email', 'new@example.com', '--token', 'new-token', '--url', 'https://new.atlassian.net', '--profile', 'work'],
      createMockConfig(),
    )

    command.log = () => {}

    await command.run()

    expect(writtenData.profiles.default).to.deep.equal({
      apiToken: 'test-token',
      email: 'test@example.com',
      host: 'https://test.atlassian.net',
    })
    expect(writtenData.profiles.work).to.deep.equal({
      apiToken: 'new-token',
      email: 'new@example.com',
      host: 'https://new.atlassian.net',
    })
    expect(writtenData.auth).to.be.undefined
  })

  it('creates config file when none exists', async () => {
    let writeJSONCalled = false

    mockFs = {
      ...mockFs,
      async readJSON() {
        throw new Error('ENOENT: no such file or directory')
      },
      async writeJSON() {
        writeJSONCalled = true
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
      [
        '--email',
        'test@example.com',
        '--token',
        'token123',
        '--url',
        'https://test.atlassian.net',
        '--profile',
        'default',
      ],
      createMockConfig(),
    )

    command.log = () => {}

    await command.run()

    expect(writeJSONCalled).to.be.true
  })

  it('merges new profile into existing config', async () => {
    let writtenData: any = null

    mockFs = {
      ...mockFs,
      async readJSON() {
        return {
          profiles: {
            default: {
              apiToken: 'existing-token',
              email: 'existing@example.com',
              host: 'https://existing.atlassian.net',
            },
          },
        }
      },
      async writeJSON(_path: string, data: any) {
        writtenData = data
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
      ['--email', 'new@example.com', '--token', 'new-token', '--url', 'https://new.atlassian.net', '--profile', 'work'],
      createMockConfig(),
    )

    command.log = () => {}

    await command.run()

    expect(writtenData.profiles.default).to.deep.equal({
      apiToken: 'existing-token',
      email: 'existing@example.com',
      host: 'https://existing.atlassian.net',
    })
    expect(writtenData.profiles.work).to.deep.equal({
      apiToken: 'new-token',
      email: 'new@example.com',
      host: 'https://new.atlassian.net',
    })
  })

  it('errors when adding a profile that already exists', async () => {
    mockFs = {
      ...mockFs,
      async readJSON() {
        return {
          profiles: {
            default: {
              apiToken: 'existing-token',
              email: 'existing@example.com',
              host: 'https://existing.atlassian.net',
            },
          },
        }
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
      [
        '--email',
        'new@example.com',
        '--token',
        'new-token',
        '--url',
        'https://new.atlassian.net',
        '--profile',
        'default',
      ],
      createMockConfig(),
    )

    let errorThrown = false
    command.error = (msg: string) => {
      errorThrown = true
      expect(msg).to.include("Profile 'default' already exists")
    }

    await command.run()

    expect(errorThrown).to.be.true
  })

  it('errors when adding default profile to old-format config', async () => {
    mockFs = {
      ...mockFs,
      async readJSON() {
        return {
          auth: {
            apiToken: 'test-token',
            email: 'test@example.com',
            host: 'https://test.atlassian.net',
          },
        }
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
      [
        '--email',
        'new@example.com',
        '--token',
        'new-token',
        '--url',
        'https://new.atlassian.net',
        '--profile',
        'default',
      ],
      createMockConfig(),
    )

    let errorThrown = false
    command.error = (msg: string) => {
      errorThrown = true
      expect(msg).to.include("Profile 'default' already exists")
    }

    await command.run()

    expect(errorThrown).to.be.true
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
      [
        '--email',
        'test@example.com',
        '--token',
        'token123',
        '--url',
        'https://test.atlassian.net',
        '--profile',
        'work',
      ],
      createMockConfig(),
    )

    command.log = () => {}

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
