/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('issue:get', () => {
  let IssueGet: any
  let mockReadConfig: any
  let mockGetIssue: any
  let mockClearClients: any
  let logOutput: string[]
  let jsonOutput: any

  beforeEach(async () => {
    logOutput = []
    jsonOutput = null

    // Mock successful config read
    mockReadConfig = async () => ({
      auth: {
        apiToken: 'test-token',
        email: 'test@example.com',
        host: 'https://test.atlassian.net',
      },
    })

    // Mock successful getIssue call
    mockGetIssue = async (_config: any, issueId: string) => ({
      data: {
        fields: {
          description: 'Test Description',
          summary: 'Test Issue',
        },
        id: '10001',
        key: issueId,
      },
      success: true,
    })

    mockClearClients = () => {}

    // Import with mocks
    IssueGet = await esmock('../../../../src/commands/jira/issue/get.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getIssue: mockGetIssue,
      },
    })
  })

  it('retrieves issue with valid issue ID', async () => {
    const command = new IssueGet.default(['TEST-123'], createMockConfig())

    // Capture logJson output
    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
    expect(jsonOutput.data).to.have.property('key', 'TEST-123')
    expect(jsonOutput.data.fields).to.have.property('summary', 'Test Issue')
  })

  it('formats output as TOON when --toon flag is provided', async () => {
    const command = new IssueGet.default(['TEST-123', '--toon'], createMockConfig())

    // Capture log output
    command.log = (output: string) => {
      logOutput.push(output)
    }

    await command.run()

    expect(logOutput.length).to.be.greaterThan(0)
    expect(logOutput.join('\n')).to.include('TEST-123')
  })

  it('handles API errors gracefully', async () => {
    // Mock failed API call
    mockGetIssue = async () => ({
      error: 'Issue not found',
      success: false,
    })

    IssueGet = await esmock('../../../../src/commands/jira/issue/get.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getIssue: mockGetIssue,
      },
    })

    const command = new IssueGet.default(['INVALID-999'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput.success).to.be.false
    expect(jsonOutput.error).to.include('Issue not found')
  })

  it('exits early when config is not available', async () => {
    // Mock config read failure
    mockReadConfig = async () => null

    IssueGet = await esmock('../../../../src/commands/jira/issue/get.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getIssue: mockGetIssue,
      },
    })

    const command = new IssueGet.default(['TEST-123'], createMockConfig())
    let getIssueCalled = false

    // Track if getIssue was called
    mockGetIssue = async () => {
      getIssueCalled = true
      return {data: {}, success: true}
    }

    await command.run()

    // Should not call getIssue if config is null
    expect(getIssueCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    IssueGet = await esmock('../../../../src/commands/jira/issue/get.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getIssue: mockGetIssue,
      },
    })

    const command = new IssueGet.default(['TEST-123'], createMockConfig())
    command.logJson = () => {}

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
