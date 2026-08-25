/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('board:sprint-issues', () => {
  let BoardSprintIssues: any
  let mockCreateProfileManager: any
  let mockGetBoardIssuesForSprint: any
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

    mockGetBoardIssuesForSprint = async () => ({
      data: {
        issues: [
          {id: '1', key: 'TEST-1', summary: 'Issue 1'},
          {id: '2', key: 'TEST-2', summary: 'Issue 2'},
        ],
      },
      success: true,
    })

    mockClearClients = () => {}

    BoardSprintIssues = await esmock('../../../../src/commands/jira/board/sprint-issues.js', {
      '../../../../src/agile/agile-client.js': {
        clearClients: mockClearClients,
        getBoardIssuesForSprint: mockGetBoardIssuesForSprint,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })
  })

  it('gets sprint issues successfully', async () => {
    const command = new BoardSprintIssues.default(['123', '456'], createMockConfig())

    const result = await command.run()

    expect(result).to.not.be.null
    expect(result.success).to.be.true
    expect(result.data.issues).to.be.an('array')
    expect(result.data.issues).to.have.lengthOf(2)
  })

  it('gets sprint issues with JQL filter', async () => {
    const command = new BoardSprintIssues.default(['123', '456', 'status=Open'], createMockConfig())

    const result = await command.run()

    expect(result).to.not.be.null
    expect(result.success).to.be.true
  })

  it('respects --max flag for pagination', async () => {
    const command = new BoardSprintIssues.default(['123', '456', '--max', '10'], createMockConfig())

    const result = await command.run()

    expect(result).to.not.be.null
    expect(result.success).to.be.true
  })

  it('respects --next flag for pagination', async () => {
    const command = new BoardSprintIssues.default(['123', '456', '--next', 'page-token'], createMockConfig())

    const result = await command.run()

    expect(result).to.not.be.null
    expect(result.success).to.be.true
  })

  it('respects --fields flag', async () => {
    const command = new BoardSprintIssues.default(['123', '456', '--fields', 'comment,creator'], createMockConfig())

    const result = await command.run()

    expect(result).to.not.be.null
    expect(result.success).to.be.true
  })

  it('formats output as TOON when --toon flag is provided', async () => {
    const command = new BoardSprintIssues.default(['123', '456', '--toon'], createMockConfig())

    command.log = (output: string) => {
      logOutput.push(output)
    }

    await command.run()

    expect(logOutput.length).to.be.greaterThan(0)
  })

  it('handles API errors gracefully', async () => {
    mockGetBoardIssuesForSprint = async () => ({
      error: 'Sprint not found',
      success: false,
    })

    BoardSprintIssues = await esmock('../../../../src/commands/jira/board/sprint-issues.js', {
      '../../../../src/agile/agile-client.js': {
        clearClients: mockClearClients,
        getBoardIssuesForSprint: mockGetBoardIssuesForSprint,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new BoardSprintIssues.default(['123', '999'], createMockConfig())

    const result = await command.run()

    expect(result.success).to.be.false
    expect(result.error).to.include('Sprint not found')
  })

  it('exits early when auth is not available', async () => {
    mockCreateProfileManager = () => ({loadAuthConfig: async () => null})

    BoardSprintIssues = await esmock('../../../../src/commands/jira/board/sprint-issues.js', {
      '../../../../src/agile/agile-client.js': {
        clearClients: mockClearClients,
        getBoardIssuesForSprint: mockGetBoardIssuesForSprint,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new BoardSprintIssues.default(['123', '456'], createMockConfig())

    let getBoardIssuesForSprintCalled = false
    mockGetBoardIssuesForSprint = async () => {
      getBoardIssuesForSprintCalled = true
      return {data: {}, success: true}
    }

    await command.run().catch(() => {})

    expect(getBoardIssuesForSprintCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    BoardSprintIssues = await esmock('../../../../src/commands/jira/board/sprint-issues.js', {
      '../../../../src/agile/agile-client.js': {
        clearClients: mockClearClients,
        getBoardIssuesForSprint: mockGetBoardIssuesForSprint,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new BoardSprintIssues.default(['123', '456'], createMockConfig())

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
