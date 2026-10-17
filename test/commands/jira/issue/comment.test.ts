/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'

import {createMockConfig} from '../../../helpers/config-mock.js'
import {mockStdin} from '../../../helpers/stdin-mock.js'

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

  describe('@<path> body', () => {
    let dir: string
    let capturedBody: string | undefined

    beforeEach(async () => {
      dir = mkdtempSync(path.join(tmpdir(), 'jira-comment-'))
      capturedBody = undefined
      IssueAddComment = await esmock('../../../../src/commands/jira/issue/comment.js', {
        '../../../../src/jira/jira-client.js': {
          async addComment(_config: any, _issueId: string, body: string) {
            capturedBody = body
            return {data: {id: '10001'}, success: true}
          },
          addCommentWithMedia: mockAddCommentWithMedia,
          clearClients: mockClearClients,
        },
        '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
      })
    })

    afterEach(() => {
      rmSync(dir, {force: true, recursive: true})
    })

    it('reads the comment text from the file', async () => {
      const file = path.join(dir, 'body.md')
      writeFileSync(file, '# Long comment\n\nbody')

      await new IssueAddComment.default(['TEST-123', `@${file}`], createMockConfig()).run()

      expect(capturedBody).to.equal('# Long comment\n\nbody')
    })

    it('reads the whole comment from @- when stdin arrives in chunks', async () => {
      const restore = mockStdin('# Piped\n\n', 'first chunk, ', 'second chunk')
      try {
        await new IssueAddComment.default(['TEST-123', '@-'], createMockConfig()).run()
      } finally {
        restore()
      }

      expect(capturedBody).to.equal('# Piped\n\nfirst chunk, second chunk')
    })

    it('keeps a literal leading @ escaped as @@', async () => {
      await new IssueAddComment.default(['TEST-123', '@@team please review'], createMockConfig()).run()

      expect(capturedBody).to.equal('@team please review')
    })

    it('names the path when the file cannot be read', async () => {
      const error = await new IssueAddComment.default(
        ['TEST-123', `@${path.join(dir, 'missing.md')}`],
        createMockConfig(),
      )
        .run()
        .catch((error_: Error) => error_)

      expect(error.message).to.include('missing.md')
      expect(capturedBody).to.be.undefined
    })
  })
})
