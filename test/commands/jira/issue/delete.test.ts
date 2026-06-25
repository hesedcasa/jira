/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('issue:delete', () => {
  let IssueDelete: any
  let mockCreateProfileManager: any
  let mockDeleteIssue: any
  let mockClearClients: any

  beforeEach(async () => {
    mockCreateProfileManager = () => ({
      loadAuthConfig: async () => ({
        apiToken: 'test-token',
        email: 'test@example.com',
        host: 'https://test.atlassian.net',
      }),
    })

    mockDeleteIssue = async () => ({
      data: {},
      success: true,
    })

    mockClearClients = () => {}

    IssueDelete = await esmock('../../../../src/commands/jira/issue/delete.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        deleteIssue: mockDeleteIssue,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })
  })

  it('deletes issue successfully', async () => {
    const command = new IssueDelete.default(['TEST-123'], createMockConfig())

    const result = await command.run()

    expect(result).to.not.be.null
    expect(result.success).to.be.true
  })

  it('handles API errors gracefully', async () => {
    mockDeleteIssue = async () => ({
      error: 'Issue not found',
      success: false,
    })

    IssueDelete = await esmock('../../../../src/commands/jira/issue/delete.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        deleteIssue: mockDeleteIssue,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueDelete.default(['TEST-999'], createMockConfig())

    const result = await command.run()

    expect(result.success).to.be.false
    expect(result.error).to.include('Issue not found')
  })

  it('exits early when auth is not available', async () => {
    mockCreateProfileManager = () => ({loadAuthConfig: async () => null})

    IssueDelete = await esmock('../../../../src/commands/jira/issue/delete.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        deleteIssue: mockDeleteIssue,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueDelete.default(['TEST-123'], createMockConfig())

    let deleteIssueCalled = false
    mockDeleteIssue = async () => {
      deleteIssueCalled = true
      return {data: {}, success: true}
    }

    await command.run().catch(() => {})

    expect(deleteIssueCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    IssueDelete = await esmock('../../../../src/commands/jira/issue/delete.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        deleteIssue: mockDeleteIssue,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueDelete.default(['TEST-123'], createMockConfig())

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
