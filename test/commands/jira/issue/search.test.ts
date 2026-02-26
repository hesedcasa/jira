/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
/* eslint-disable max-params */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('issue:search', () => {
  let IssueSearch: any
  let mockReadConfig: any
  let mockSearchIssues: any
  let mockClearClients: any
  let jsonOutput: any
  let logOutput: string[]

  beforeEach(async () => {
    jsonOutput = null
    logOutput = []

    // Mock successful config read
    mockReadConfig = async () => ({
      auth: {
        apiToken: 'test-token',
        email: 'test@example.com',
        host: 'https://test.atlassian.net',
      },
    })

    // Mock successful searchIssues call
    mockSearchIssues = async (_config: any, _jql: string, _max?: number, _next?: string, _fields?: string[]) => ({
      data: {
        issues: [
          {
            fields: {
              summary: 'Test Issue 1',
            },
            id: '10001',
            key: 'TEST-123',
          },
          {
            fields: {
              summary: 'Test Issue 2',
            },
            id: '10002',
            key: 'TEST-124',
          },
        ],
        maxResults: 50,
        startAt: 0,
        total: 2,
      },
      success: true,
    })

    mockClearClients = () => {}

    // Import with mocks
    IssueSearch = await esmock('../../../../src/commands/jira/issue/search.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        searchIssues: mockSearchIssues,
      },
    })
  })

  it('searches for issues with JQL query', async () => {
    const command = new IssueSearch.default(['project=TEST'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
    expect(jsonOutput.data.issues).to.be.an('array')
    expect(jsonOutput.data.issues).to.have.lengthOf(2)
  })

  it('passes JQL query correctly to searchIssues', async () => {
    let receivedJql: null | string = null

    mockSearchIssues = async (_config: any, jql: string) => {
      receivedJql = jql
      return {
        data: {issues: [], maxResults: 50, startAt: 0, total: 0},
        success: true,
      }
    }

    IssueSearch = await esmock('../../../../src/commands/jira/issue/search.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        searchIssues: mockSearchIssues,
      },
    })

    const command = new IssueSearch.default(['assignee="john@example.com" AND type=Bug'], createMockConfig())

    command.logJson = () => {}

    await command.run()

    expect(receivedJql).to.equal('assignee="john@example.com" AND type=Bug')
  })

  it('handles --max flag correctly', async () => {
    let receivedMax: number | undefined

    mockSearchIssues = async (_config: any, _jql: string, max?: number) => {
      receivedMax = max
      return {
        data: {issues: [], maxResults: 50, startAt: 0, total: 0},
        success: true,
      }
    }

    IssueSearch = await esmock('../../../../src/commands/jira/issue/search.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        searchIssues: mockSearchIssues,
      },
    })

    const command = new IssueSearch.default(['project=TEST', '--max', '10'], createMockConfig())

    command.logJson = () => {}

    await command.run()

    expect(receivedMax).to.equal(10)
  })

  it('handles --next flag correctly', async () => {
    let receivedNext: string | undefined

    mockSearchIssues = async (_config: any, _jql: string, _max?: number, next?: string) => {
      receivedNext = next
      return {
        data: {issues: [], maxResults: 50, startAt: 0, total: 0},
        success: true,
      }
    }

    IssueSearch = await esmock('../../../../src/commands/jira/issue/search.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        searchIssues: mockSearchIssues,
      },
    })

    const command = new IssueSearch.default(['project=TEST', '--next', 'pagination-token'], createMockConfig())

    command.logJson = () => {}

    await command.run()

    expect(receivedNext).to.equal('pagination-token')
  })

  it('handles --fields flag correctly', async () => {
    let receivedFields: string[] | undefined

    mockSearchIssues = async (_config: any, _jql: string, _max?: number, _next?: string, fields?: string[]) => {
      receivedFields = fields
      return {
        data: {issues: [], maxResults: 50, startAt: 0, total: 0},
        success: true,
      }
    }

    IssueSearch = await esmock('../../../../src/commands/jira/issue/search.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        searchIssues: mockSearchIssues,
      },
    })

    const command = new IssueSearch.default(['project=TEST', '--fields', 'summary,status,assignee'], createMockConfig())

    command.logJson = () => {}

    await command.run()

    expect(receivedFields).to.be.an('array')
    expect(receivedFields).to.deep.equal(['summary', 'status', 'assignee'])
  })

  it('formats output as TOON when --toon flag is provided', async () => {
    const command = new IssueSearch.default(['project=TEST', '--toon'], createMockConfig())

    command.log = (output: string) => {
      logOutput.push(output)
    }

    await command.run()

    expect(logOutput.length).to.be.greaterThan(0)
    expect(logOutput.join('\n')).to.include('TEST-123')
  })

  it('handles API errors gracefully', async () => {
    mockSearchIssues = async () => ({
      error: 'Invalid JQL query',
      success: false,
    })

    IssueSearch = await esmock('../../../../src/commands/jira/issue/search.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        searchIssues: mockSearchIssues,
      },
    })

    const command = new IssueSearch.default(['invalid jql'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput.success).to.be.false
    expect(jsonOutput.error).to.include('Invalid JQL query')
  })

  it('exits early when config is not available', async () => {
    mockReadConfig = async () => null

    IssueSearch = await esmock('../../../../src/commands/jira/issue/search.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        searchIssues: mockSearchIssues,
      },
    })

    const command = new IssueSearch.default(['project=TEST'], createMockConfig())

    let searchIssuesCalled = false

    mockSearchIssues = async () => {
      searchIssuesCalled = true
      return {data: {}, success: true}
    }

    await command.run()

    expect(searchIssuesCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    IssueSearch = await esmock('../../../../src/commands/jira/issue/search.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        searchIssues: mockSearchIssues,
      },
    })

    const command = new IssueSearch.default(['project=TEST'], createMockConfig())

    command.logJson = () => {}

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
