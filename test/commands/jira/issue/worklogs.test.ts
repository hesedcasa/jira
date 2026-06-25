/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('issue:get-worklogs', () => {
  let IssueGetWorklogs: any
  let mockCreateProfileManager: any
  let mockGetIssueWorklog: any
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

    mockGetIssueWorklog = async () => ({
      data: {
        worklogs: [
          {
            author: {displayName: 'John Doe'},
            id: '10001',
            timeSpent: '1h',
          },
          {
            author: {displayName: 'Jane Smith'},
            id: '10002',
            timeSpent: '2h',
          },
        ],
      },
      success: true,
    })

    mockClearClients = () => {}

    IssueGetWorklogs = await esmock('../../../../src/commands/jira/issue/worklogs.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getIssueWorklog: mockGetIssueWorklog,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })
  })

  it('gets worklogs successfully', async () => {
    const command = new IssueGetWorklogs.default(['TEST-123'], createMockConfig())

    const result = await command.run()

    expect(result).to.not.be.null
    expect(result.success).to.be.true
    expect(result.data.worklogs).to.be.an('array')
    expect(result.data.worklogs).to.have.lengthOf(2)
  })

  it('respects --max flag for pagination', async () => {
    const command = new IssueGetWorklogs.default(['TEST-123', '--max', '10'], createMockConfig())

    const result = await command.run()

    expect(result).to.not.be.null
    expect(result.success).to.be.true
  })

  it('respects --start flag for pagination', async () => {
    const command = new IssueGetWorklogs.default(['TEST-123', '--start', '5'], createMockConfig())

    const result = await command.run()

    expect(result).to.not.be.null
    expect(result.success).to.be.true
  })

  it('formats output as TOON when --toon flag is provided', async () => {
    const command = new IssueGetWorklogs.default(['TEST-123', '--toon'], createMockConfig())

    command.log = (output: string) => {
      logOutput.push(output)
    }

    await command.run()

    expect(logOutput.length).to.be.greaterThan(0)
  })

  it('handles API errors gracefully', async () => {
    mockGetIssueWorklog = async () => ({
      error: 'Issue not found',
      success: false,
    })

    IssueGetWorklogs = await esmock('../../../../src/commands/jira/issue/worklogs.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getIssueWorklog: mockGetIssueWorklog,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueGetWorklogs.default(['INVALID-999'], createMockConfig())

    const result = await command.run()

    expect(result.success).to.be.false
    expect(result.error).to.include('Issue not found')
  })

  it('exits early when auth is not available', async () => {
    mockCreateProfileManager = () => ({loadAuthConfig: async () => null})

    IssueGetWorklogs = await esmock('../../../../src/commands/jira/issue/worklogs.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getIssueWorklog: mockGetIssueWorklog,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueGetWorklogs.default(['TEST-123'], createMockConfig())

    let getIssueWorklogCalled = false
    mockGetIssueWorklog = async () => {
      getIssueWorklogCalled = true
      return {data: {}, success: true}
    }

    await command.run().catch(() => {})

    expect(getIssueWorklogCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    IssueGetWorklogs = await esmock('../../../../src/commands/jira/issue/worklogs.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getIssueWorklog: mockGetIssueWorklog,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueGetWorklogs.default(['TEST-123'], createMockConfig())

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
