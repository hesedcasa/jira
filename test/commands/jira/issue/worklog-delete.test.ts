/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('issue:delete-worklog', () => {
  let IssueDeleteWorklog: any
  let mockCreateProfileManager: any
  let mockDeleteWorklog: any
  let mockClearClients: any

  beforeEach(async () => {
    mockCreateProfileManager = () => ({
      loadAuthConfig: async () => ({
        apiToken: 'test-token',
        email: 'test@example.com',
        host: 'https://test.atlassian.net',
      }),
    })

    mockDeleteWorklog = async () => ({
      data: {},
      success: true,
    })

    mockClearClients = () => {}

    IssueDeleteWorklog = await esmock('../../../../src/commands/jira/issue/worklog-delete.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        deleteWorklog: mockDeleteWorklog,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })
  })

  it('deletes worklog successfully', async () => {
    const command = new IssueDeleteWorklog.default(['TEST-123', '10001'], createMockConfig())

    const result = await command.run()

    expect(result).to.not.be.null
    expect(result.success).to.be.true
  })

  it('handles API errors gracefully', async () => {
    mockDeleteWorklog = async () => ({
      error: 'Worklog not found',
      success: false,
    })

    IssueDeleteWorklog = await esmock('../../../../src/commands/jira/issue/worklog-delete.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        deleteWorklog: mockDeleteWorklog,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueDeleteWorklog.default(['TEST-123', '99999'], createMockConfig())

    const result = await command.run()

    expect(result.success).to.be.false
    expect(result.error).to.include('Worklog not found')
  })

  it('exits early when auth is not available', async () => {
    mockCreateProfileManager = () => ({loadAuthConfig: async () => null})

    IssueDeleteWorklog = await esmock('../../../../src/commands/jira/issue/worklog-delete.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        deleteWorklog: mockDeleteWorklog,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueDeleteWorklog.default(['TEST-123', '10001'], createMockConfig())

    let deleteWorklogCalled = false
    mockDeleteWorklog = async () => {
      deleteWorklogCalled = true
      return {data: {}, success: true}
    }

    await command.run().catch(() => {})

    expect(deleteWorklogCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    IssueDeleteWorklog = await esmock('../../../../src/commands/jira/issue/worklog-delete.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        deleteWorklog: mockDeleteWorklog,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueDeleteWorklog.default(['TEST-123', '10001'], createMockConfig())

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
