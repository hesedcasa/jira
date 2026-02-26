/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('issue:add-comment', () => {
  let IssueAddComment: any
  let mockReadConfig: any
  let mockAddComment: any
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

    mockAddComment = async () => ({
      data: {body: 'Test comment', id: '10001'},
      success: true,
    })

    mockClearClients = () => {}

    IssueAddComment = await esmock('../../../../src/commands/jira/issue/comment.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        addComment: mockAddComment,
        clearClients: mockClearClients,
      },
    })
  })

  it('adds comment successfully', async () => {
    const command = new IssueAddComment.default(['TEST-123', 'Test comment'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
    expect(jsonOutput.data).to.have.property('id', '10001')
  })

  it('formats output as TOON when --toon flag is provided', async () => {
    const command = new IssueAddComment.default(['TEST-123', 'Test comment', '--toon'], createMockConfig())

    command.log = (output: string) => {
      logOutput.push(output)
    }

    await command.run()

    expect(logOutput.length).to.be.greaterThan(0)
  })

  it('handles API errors gracefully', async () => {
    mockAddComment = async () => ({
      error: 'Permission denied',
      success: false,
    })

    IssueAddComment = await esmock('../../../../src/commands/jira/issue/comment.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        addComment: mockAddComment,
        clearClients: mockClearClients,
      },
    })

    const command = new IssueAddComment.default(['TEST-123', 'Test comment'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput.success).to.be.false
    expect(jsonOutput.error).to.include('Permission denied')
  })

  it('exits early when config is not available', async () => {
    mockReadConfig = async () => null

    IssueAddComment = await esmock('../../../../src/commands/jira/issue/comment.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        addComment: mockAddComment,
        clearClients: mockClearClients,
      },
    })

    const command = new IssueAddComment.default(['TEST-123', 'Test comment'], createMockConfig())

    let addCommentCalled = false
    mockAddComment = async () => {
      addCommentCalled = true
      return {data: {}, success: true}
    }

    await command.run()

    expect(addCommentCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    IssueAddComment = await esmock('../../../../src/commands/jira/issue/comment.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        addComment: mockAddComment,
        clearClients: mockClearClients,
      },
    })

    const command = new IssueAddComment.default(['TEST-123', 'Test comment'], createMockConfig())
    command.logJson = () => {}

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
