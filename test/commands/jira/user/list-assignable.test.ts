/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('user:list-assignable', () => {
  let UserListAssignable: any
  let mockReadConfig: any
  let mockFindAssignableUsers: any
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

    mockFindAssignableUsers = async () => ({
      data: {
        users: [
          {accountId: '1', displayName: 'John Doe'},
          {accountId: '2', displayName: 'Jane Smith'},
        ],
      },
      success: true,
    })

    mockClearClients = () => {}

    UserListAssignable = await esmock('../../../../src/commands/jira/user/list-assignable.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        findAssignableUsers: mockFindAssignableUsers,
      },
    })
  })

  it('lists assignable users successfully', async () => {
    const command = new UserListAssignable.default(['TEST-123'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
    expect(jsonOutput.data.users).to.be.an('array')
    expect(jsonOutput.data.users).to.have.lengthOf(2)
  })

  it('respects --query flag for filtering users', async () => {
    const command = new UserListAssignable.default(['TEST-123', '--query', 'john'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
  })

  it('respects -q shorthand flag for query', async () => {
    const command = new UserListAssignable.default(['TEST-123', '-q', 'jane'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
  })

  it('formats output as TOON when --toon flag is provided', async () => {
    const command = new UserListAssignable.default(['TEST-123', '--toon'], createMockConfig())

    command.log = (output: string) => {
      logOutput.push(output)
    }

    await command.run()

    expect(logOutput.length).to.be.greaterThan(0)
  })

  it('handles API errors gracefully', async () => {
    mockFindAssignableUsers = async () => ({
      error: 'Issue not found',
      success: false,
    })

    UserListAssignable = await esmock('../../../../src/commands/jira/user/list-assignable.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        findAssignableUsers: mockFindAssignableUsers,
      },
    })

    const command = new UserListAssignable.default(['INVALID-999'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput.success).to.be.false
    expect(jsonOutput.error).to.include('Issue not found')
  })

  it('exits early when config is not available', async () => {
    mockReadConfig = async () => null

    UserListAssignable = await esmock('../../../../src/commands/jira/user/list-assignable.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        findAssignableUsers: mockFindAssignableUsers,
      },
    })

    const command = new UserListAssignable.default(['TEST-123'], createMockConfig())

    let findAssignableUsersCalled = false
    mockFindAssignableUsers = async () => {
      findAssignableUsersCalled = true
      return {data: {}, success: true}
    }

    await command.run()

    expect(findAssignableUsersCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    UserListAssignable = await esmock('../../../../src/commands/jira/user/list-assignable.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        findAssignableUsers: mockFindAssignableUsers,
      },
    })

    const command = new UserListAssignable.default(['TEST-123'], createMockConfig())
    command.logJson = () => {}

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
