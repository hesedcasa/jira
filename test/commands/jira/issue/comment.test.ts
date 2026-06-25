/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('issue:add-comment', () => {
  let IssueAddComment: any
  let mockCreateProfileManager: any
  let mockAddComment: any
  let mockAddCommentWithMedia: any
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

    mockAddComment = async () => ({
      data: {body: 'Test comment', id: '10001'},
      success: true,
    })

    mockAddCommentWithMedia = async () => ({
      data: {body: 'Test comment with media', id: '10002'},
      success: true,
    })

    mockClearClients = () => {}

    IssueAddComment = await esmock('../../../../src/commands/jira/issue/comment.js', {
      '../../../../src/jira/jira-client.js': {
        addComment: mockAddComment,
        addCommentWithMedia: mockAddCommentWithMedia,
        clearClients: mockClearClients,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })
  })

  it('adds comment successfully', async () => {
    const command = new IssueAddComment.default(['TEST-123', 'Test comment'], createMockConfig())

    const result = await command.run()

    expect(result).to.not.be.null
    expect(result.success).to.be.true
    expect(result.data).to.have.property('id', '10001')
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
      '../../../../src/jira/jira-client.js': {
        addComment: mockAddComment,
        addCommentWithMedia: mockAddCommentWithMedia,
        clearClients: mockClearClients,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueAddComment.default(['TEST-123', 'Test comment'], createMockConfig())

    const result = await command.run()

    expect(result.success).to.be.false
    expect(result.error).to.include('Permission denied')
  })

  it('exits early when auth is not available', async () => {
    mockCreateProfileManager = () => ({loadAuthConfig: async () => null})

    IssueAddComment = await esmock('../../../../src/commands/jira/issue/comment.js', {
      '../../../../src/jira/jira-client.js': {
        addComment: mockAddComment,
        addCommentWithMedia: mockAddCommentWithMedia,
        clearClients: mockClearClients,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueAddComment.default(['TEST-123', 'Test comment'], createMockConfig())

    let addCommentCalled = false
    mockAddComment = async () => {
      addCommentCalled = true
      return {data: {}, success: true}
    }

    await command.run().catch(() => {})

    expect(addCommentCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    IssueAddComment = await esmock('../../../../src/commands/jira/issue/comment.js', {
      '../../../../src/jira/jira-client.js': {
        addComment: mockAddComment,
        addCommentWithMedia: mockAddCommentWithMedia,
        clearClients: mockClearClients,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueAddComment.default(['TEST-123', 'Test comment'], createMockConfig())

    await command.run()

    expect(clearClientsCalled).to.be.true
  })

  it('uses addCommentWithMedia when --attach flag is provided', async () => {
    let addCommentWithMediaCalled = false
    let addCommentCalled = false
    let capturedFilePaths: string[] = []

    mockAddCommentWithMedia = async (_config: any, _issueId: string, _body: string, filePaths: string[]) => {
      addCommentWithMediaCalled = true
      capturedFilePaths = filePaths
      return {data: {body: 'comment with media', id: '10002'}, success: true}
    }

    mockAddComment = async () => {
      addCommentCalled = true
      return {data: {id: '10001'}, success: true}
    }

    IssueAddComment = await esmock('../../../../src/commands/jira/issue/comment.js', {
      '../../../../src/jira/jira-client.js': {
        addComment: mockAddComment,
        addCommentWithMedia: mockAddCommentWithMedia,
        clearClients: mockClearClients,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueAddComment.default(
      ['TEST-123', 'See attached', '--attach', './screenshot.png'],
      createMockConfig(),
    )

    const result = await command.run()

    expect(addCommentWithMediaCalled).to.be.true
    expect(addCommentCalled).to.be.false
    expect(capturedFilePaths).to.deep.equal(['./screenshot.png'])
    expect(result.success).to.be.true
  })

  it('supports multiple --attach flags', async () => {
    let capturedFilePaths: string[] = []

    mockAddCommentWithMedia = async (_config: any, _issueId: string, _body: string, filePaths: string[]) => {
      capturedFilePaths = filePaths
      return {data: {id: '10002'}, success: true}
    }

    IssueAddComment = await esmock('../../../../src/commands/jira/issue/comment.js', {
      '../../../../src/jira/jira-client.js': {
        addComment: mockAddComment,
        addCommentWithMedia: mockAddCommentWithMedia,
        clearClients: mockClearClients,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueAddComment.default(
      ['TEST-123', 'See attached', '--attach', './image.png', '--attach', './video.mp4'],
      createMockConfig(),
    )

    await command.run()

    expect(capturedFilePaths).to.deep.equal(['./image.png', './video.mp4'])
  })
})
