/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('issue:delete', () => {
  let IssueDelete: any
  let mockReadConfig: any
  let mockDeleteIssue: any
  let mockClearClients: any
  let jsonOutput: any

  beforeEach(async () => {
    jsonOutput = null

    mockReadConfig = async () => ({
      auth: {
        apiToken: 'test-token',
        email: 'test@example.com',
        host: 'https://test.atlassian.net',
      },
    })

    mockDeleteIssue = async () => ({
      data: {},
      success: true,
    })

    mockClearClients = () => {}

    IssueDelete = await esmock('../../../../src/commands/jira/issue/delete.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        deleteIssue: mockDeleteIssue,
      },
    })
  })

  it('deletes issue successfully', async () => {
    const command = new IssueDelete.default(['TEST-123'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
  })

  it('handles API errors gracefully', async () => {
    mockDeleteIssue = async () => ({
      error: 'Issue not found',
      success: false,
    })

    IssueDelete = await esmock('../../../../src/commands/jira/issue/delete.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        deleteIssue: mockDeleteIssue,
      },
    })

    const command = new IssueDelete.default(['TEST-999'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput.success).to.be.false
    expect(jsonOutput.error).to.include('Issue not found')
  })

  it('exits early when config is not available', async () => {
    mockReadConfig = async () => null

    IssueDelete = await esmock('../../../../src/commands/jira/issue/delete.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        deleteIssue: mockDeleteIssue,
      },
    })

    const command = new IssueDelete.default(['TEST-123'], createMockConfig())

    let deleteIssueCalled = false
    mockDeleteIssue = async () => {
      deleteIssueCalled = true
      return {data: {}, success: true}
    }

    await command.run()

    expect(deleteIssueCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    IssueDelete = await esmock('../../../../src/commands/jira/issue/delete.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        deleteIssue: mockDeleteIssue,
      },
    })

    const command = new IssueDelete.default(['TEST-123'], createMockConfig())
    command.logJson = () => {}

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
