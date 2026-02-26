/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('issue:update-comment', () => {
  let IssueUpdateComment: any
  let mockReadConfig: any
  let mockUpdateComment: any
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

    mockUpdateComment = async () => ({
      data: {
        body: 'Updated comment',
        id: '10001',
      },
      success: true,
    })

    mockClearClients = () => {}

    IssueUpdateComment = await esmock('../../../../src/commands/jira/issue/update-comment.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        updateComment: mockUpdateComment,
      },
    })
  })

  it('updates comment successfully', async () => {
    const command = new IssueUpdateComment.default(['TEST-123', '10001', 'Updated text'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
    expect(jsonOutput.data.id).to.equal('10001')
  })

  it('formats output as TOON when --toon flag is provided', async () => {
    const command = new IssueUpdateComment.default(['TEST-123', '10001', 'Updated text', '--toon'], createMockConfig())

    command.log = (output: string) => {
      logOutput.push(output)
    }

    await command.run()

    expect(logOutput.length).to.be.greaterThan(0)
  })

  it('handles API errors gracefully', async () => {
    mockUpdateComment = async () => ({
      error: 'Comment not found',
      success: false,
    })

    IssueUpdateComment = await esmock('../../../../src/commands/jira/issue/update-comment.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        updateComment: mockUpdateComment,
      },
    })

    const command = new IssueUpdateComment.default(['TEST-123', '99999', 'Updated text'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput.success).to.be.false
    expect(jsonOutput.error).to.include('Comment not found')
  })

  it('exits early when config is not available', async () => {
    mockReadConfig = async () => null

    IssueUpdateComment = await esmock('../../../../src/commands/jira/issue/update-comment.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        updateComment: mockUpdateComment,
      },
    })

    const command = new IssueUpdateComment.default(['TEST-123', '10001', 'Updated text'], createMockConfig())

    let updateCommentCalled = false
    mockUpdateComment = async () => {
      updateCommentCalled = true
      return {data: {}, success: true}
    }

    await command.run()

    expect(updateCommentCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    IssueUpdateComment = await esmock('../../../../src/commands/jira/issue/update-comment.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        updateComment: mockUpdateComment,
      },
    })

    const command = new IssueUpdateComment.default(['TEST-123', '10001', 'Updated text'], createMockConfig())
    command.logJson = () => {}

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
