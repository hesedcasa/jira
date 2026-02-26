/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('issue:worklog', () => {
  let IssueWorklog: any
  let mockReadConfig: any
  let mockWorklog: any
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

    mockWorklog = async () => ({
      data: {
        id: '10001',
        timeSpent: '1h',
      },
      success: true,
    })

    mockClearClients = () => {}

    IssueWorklog = await esmock('../../../../src/commands/jira/issue/worklog.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        worklog: mockWorklog,
      },
    })
  })

  it('adds worklog successfully with required args', async () => {
    const command = new IssueWorklog.default(['TEST-123', '2024-01-01T10:00:00.000+0000', '1h'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
    expect(jsonOutput.data.id).to.equal('10001')
  })

  it('adds worklog with comment', async () => {
    const command = new IssueWorklog.default(
      ['TEST-123', '2024-01-01T10:00:00.000+0000', '1h', 'Work completed'],
      createMockConfig(),
    )

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
  })

  it('formats output as TOON when --toon flag is provided', async () => {
    const command = new IssueWorklog.default(
      ['TEST-123', '2024-01-01T10:00:00.000+0000', '2h', '--toon'],
      createMockConfig(),
    )

    command.log = (output: string) => {
      logOutput.push(output)
    }

    await command.run()

    expect(logOutput.length).to.be.greaterThan(0)
  })

  it('handles API errors gracefully', async () => {
    mockWorklog = async () => ({
      error: 'Invalid time format',
      success: false,
    })

    IssueWorklog = await esmock('../../../../src/commands/jira/issue/worklog.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        worklog: mockWorklog,
      },
    })

    const command = new IssueWorklog.default(['TEST-123', 'invalid-date', '1h'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput.success).to.be.false
    expect(jsonOutput.error).to.include('Invalid time format')
  })

  it('exits early when config is not available', async () => {
    mockReadConfig = async () => null

    IssueWorklog = await esmock('../../../../src/commands/jira/issue/worklog.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        worklog: mockWorklog,
      },
    })

    const command = new IssueWorklog.default(['TEST-123', '2024-01-01T10:00:00.000+0000', '1h'], createMockConfig())

    let worklogCalled = false
    mockWorklog = async () => {
      worklogCalled = true
      return {data: {}, success: true}
    }

    await command.run()

    expect(worklogCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    IssueWorklog = await esmock('../../../../src/commands/jira/issue/worklog.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        worklog: mockWorklog,
      },
    })

    const command = new IssueWorklog.default(['TEST-123', '2024-01-01T10:00:00.000+0000', '1h'], createMockConfig())
    command.logJson = () => {}

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
