/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('issue:assign', () => {
  let IssueAssign: any
  let mockReadConfig: any
  let mockAssignIssue: any
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

    mockAssignIssue = async () => ({
      data: {},
      success: true,
    })

    mockClearClients = () => {}

    IssueAssign = await esmock('../../../../src/commands/jira/issue/assign.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        assignIssue: mockAssignIssue,
        clearClients: mockClearClients,
      },
    })
  })

  it('assigns issue successfully', async () => {
    const command = new IssueAssign.default(['TEST-123', '5b10ac8d82e05b22cc7d4ef5'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
  })

  it('handles API errors gracefully', async () => {
    mockAssignIssue = async () => ({
      error: 'User not found',
      success: false,
    })

    IssueAssign = await esmock('../../../../src/commands/jira/issue/assign.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        assignIssue: mockAssignIssue,
        clearClients: mockClearClients,
      },
    })

    const command = new IssueAssign.default(['TEST-123', 'invalid-user'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput.success).to.be.false
    expect(jsonOutput.error).to.include('User not found')
  })

  it('exits early when config is not available', async () => {
    mockReadConfig = async () => null

    IssueAssign = await esmock('../../../../src/commands/jira/issue/assign.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        assignIssue: mockAssignIssue,
        clearClients: mockClearClients,
      },
    })

    const command = new IssueAssign.default(['TEST-123', 'user-id'], createMockConfig())

    let assignIssueCalled = false
    mockAssignIssue = async () => {
      assignIssueCalled = true
      return {data: {}, success: true}
    }

    await command.run()

    expect(assignIssueCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    IssueAssign = await esmock('../../../../src/commands/jira/issue/assign.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        assignIssue: mockAssignIssue,
        clearClients: mockClearClients,
      },
    })

    const command = new IssueAssign.default(['TEST-123', 'user-id'], createMockConfig())
    command.logJson = () => {}

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
