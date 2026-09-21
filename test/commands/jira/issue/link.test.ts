/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('issue:link', () => {
  let IssueLink: any
  let mockCreateProfileManager: any
  let mockLinkIssues: any
  let mockClearClients: any
  let linkArgs: any[]

  beforeEach(async () => {
    linkArgs = []
    mockCreateProfileManager = () => ({
      loadAuthConfig: async () => ({
        apiToken: 'test-token',
        email: 'test@example.com',
        host: 'https://test.atlassian.net',
      }),
    })

    mockLinkIssues = async (...args: any[]) => {
      linkArgs = args
      return {
        data: true,
        success: true,
      }
    }

    mockClearClients = () => {}

    IssueLink = await esmock('../../../../src/commands/jira/issue/link.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        linkIssues: mockLinkIssues,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })
  })

  it('sends the first issue as outward and the second as inward', async () => {
    const command = new IssueLink.default(['TEST-123', 'TEST-456', '--type', 'Blocks'], createMockConfig())

    const result = await command.run()

    expect(result.success).to.be.true
    expect(linkArgs[1]).to.equal('TEST-123')
    expect(linkArgs[2]).to.equal('TEST-456')
    expect(linkArgs[3]).to.equal('Blocks')
    expect(linkArgs[4]).to.be.undefined
  })

  it('passes the comment through when given', async () => {
    const command = new IssueLink.default(
      ['TEST-123', 'TEST-456', '--type', 'Duplicates', '--comment', 'Same root cause'],
      createMockConfig(),
    )

    const result = await command.run()

    expect(result.success).to.be.true
    expect(linkArgs[3]).to.equal('Duplicates')
    expect(linkArgs[4]).to.equal('Same root cause')
  })

  it('handles API errors gracefully', async () => {
    mockLinkIssues = async () => ({
      error: 'Invalid link type',
      success: false,
    })

    IssueLink = await esmock('../../../../src/commands/jira/issue/link.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        linkIssues: mockLinkIssues,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueLink.default(['TEST-123', 'TEST-456', '--type', 'Bogus'], createMockConfig())

    const result = await command.run()

    expect(result.success).to.be.false
    expect(result.error).to.include('Invalid link type')
  })

  it('exits early when auth is not available', async () => {
    mockCreateProfileManager = () => ({loadAuthConfig: async () => null})

    IssueLink = await esmock('../../../../src/commands/jira/issue/link.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        linkIssues: mockLinkIssues,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueLink.default(['TEST-123', 'TEST-456', '--type', 'Blocks'], createMockConfig())

    await command.run().catch(() => {})

    expect(linkArgs).to.have.lengthOf(0)
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    IssueLink = await esmock('../../../../src/commands/jira/issue/link.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        linkIssues: mockLinkIssues,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueLink.default(['TEST-123', 'TEST-456', '--type', 'Blocks'], createMockConfig())

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
