/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('issue:delete-worklog', () => {
  let IssueDeleteWorklog: any
  let mockReadConfig: any
  let mockDeleteWorklog: any
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

    mockDeleteWorklog = async () => ({
      data: {},
      success: true,
    })

    mockClearClients = () => {}

    IssueDeleteWorklog = await esmock('../../../../src/commands/jira/issue/worklog-delete.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        deleteWorklog: mockDeleteWorklog,
      },
    })
  })

  it('deletes worklog successfully', async () => {
    const command = new IssueDeleteWorklog.default(['TEST-123', '10001'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
  })

  it('handles API errors gracefully', async () => {
    mockDeleteWorklog = async () => ({
      error: 'Worklog not found',
      success: false,
    })

    IssueDeleteWorklog = await esmock('../../../../src/commands/jira/issue/worklog-delete.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        deleteWorklog: mockDeleteWorklog,
      },
    })

    const command = new IssueDeleteWorklog.default(['TEST-123', '99999'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput.success).to.be.false
    expect(jsonOutput.error).to.include('Worklog not found')
  })

  it('exits early when config is not available', async () => {
    mockReadConfig = async () => null

    IssueDeleteWorklog = await esmock('../../../../src/commands/jira/issue/worklog-delete.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        deleteWorklog: mockDeleteWorklog,
      },
    })

    const command = new IssueDeleteWorklog.default(['TEST-123', '10001'], createMockConfig())

    let deleteWorklogCalled = false
    mockDeleteWorklog = async () => {
      deleteWorklogCalled = true
      return {data: {}, success: true}
    }

    await command.run()

    expect(deleteWorklogCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    IssueDeleteWorklog = await esmock('../../../../src/commands/jira/issue/worklog-delete.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        deleteWorklog: mockDeleteWorklog,
      },
    })

    const command = new IssueDeleteWorklog.default(['TEST-123', '10001'], createMockConfig())
    command.logJson = () => {}

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
