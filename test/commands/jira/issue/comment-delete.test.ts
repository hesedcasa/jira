/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('issue:delete-comment', () => {
  let IssueDeleteComment: any
  let mockReadConfig: any
  let mockDeleteComment: any
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

    mockDeleteComment = async () => ({
      data: {},
      success: true,
    })

    mockClearClients = () => {}

    IssueDeleteComment = await esmock('../../../../src/commands/jira/issue/comment-delete.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        deleteComment: mockDeleteComment,
      },
    })
  })

  it('deletes comment successfully', async () => {
    const command = new IssueDeleteComment.default(['TEST-123', '10001'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
  })

  it('handles API errors gracefully', async () => {
    mockDeleteComment = async () => ({
      error: 'Comment not found',
      success: false,
    })

    IssueDeleteComment = await esmock('../../../../src/commands/jira/issue/comment-delete.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        deleteComment: mockDeleteComment,
      },
    })

    const command = new IssueDeleteComment.default(['TEST-123', '99999'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput.success).to.be.false
    expect(jsonOutput.error).to.include('Comment not found')
  })

  it('exits early when config is not available', async () => {
    mockReadConfig = async () => null

    IssueDeleteComment = await esmock('../../../../src/commands/jira/issue/comment-delete.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        deleteComment: mockDeleteComment,
      },
    })

    const command = new IssueDeleteComment.default(['TEST-123', '10001'], createMockConfig())

    let deleteCommentCalled = false
    mockDeleteComment = async () => {
      deleteCommentCalled = true
      return {data: {}, success: true}
    }

    await command.run()

    expect(deleteCommentCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    IssueDeleteComment = await esmock('../../../../src/commands/jira/issue/comment-delete.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        deleteComment: mockDeleteComment,
      },
    })

    const command = new IssueDeleteComment.default(['TEST-123', '10001'], createMockConfig())
    command.logJson = () => {}

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
