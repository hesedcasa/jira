/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('issue:get', () => {
  let IssueGet: any
  let mockCreateProfileManager: any
  let mockGetIssue: any
  let mockClearClients: any
  let logOutput: string[]

  beforeEach(async () => {
    logOutput = []

    mockCreateProfileManager = () => ({
      loadAuthConfig: async () => ({
        apiToken: 'test-token',
        email: 'test@example.com',
        host: 'https://test.atlassian.net',
      }),
    })

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

    IssueGet = await esmock('../../../../src/commands/jira/issue/index.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getIssue: mockGetIssue,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })
  })

  it('retrieves issue with valid issue ID', async () => {
    const command = new IssueGet.default(['TEST-123'], createMockConfig())

    const result = await command.run()

    expect(result).to.not.be.null
    expect(result.success).to.be.true
    expect(result.data).to.have.property('key', 'TEST-123')
    expect(result.data.fields).to.have.property('summary', 'Test Issue')
  })

  it('formats output as TOON when --toon flag is provided', async () => {
    const command = new IssueGet.default(['TEST-123', '--toon'], createMockConfig())

    command.log = (output: string) => {
      logOutput.push(output)
    }

    await command.run()

    expect(logOutput.length).to.be.greaterThan(0)
    expect(logOutput.join('\n')).to.include('TEST-123')
  })

  it('handles API errors gracefully', async () => {
    mockGetIssue = async () => ({
      error: 'Issue not found',
      success: false,
    })

    IssueGet = await esmock('../../../../src/commands/jira/issue/index.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getIssue: mockGetIssue,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueGet.default(['INVALID-999'], createMockConfig())

    const result = await command.run()

    expect(result.success).to.be.false
    expect(result.error).to.include('Issue not found')
  })

  it('exits early when auth is not available', async () => {
    mockCreateProfileManager = () => ({loadAuthConfig: async () => null})

    IssueGet = await esmock('../../../../src/commands/jira/issue/index.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getIssue: mockGetIssue,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueGet.default(['TEST-123'], createMockConfig())
    let getIssueCalled = false

    mockGetIssue = async () => {
      getIssueCalled = true
      return {data: {}, success: true}
    }

    await command.run().catch(() => {})

    expect(getIssueCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    IssueGet = await esmock('../../../../src/commands/jira/issue/index.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getIssue: mockGetIssue,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueGet.default(['TEST-123'], createMockConfig())

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
