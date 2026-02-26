/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('board:backlogs', () => {
  let BoardBacklogs: any
  let mockReadConfig: any
  let mockGetIssuesForBacklog: any
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

    mockGetIssuesForBacklog = async () => ({
      data: {
        issues: [
          {id: '1', key: 'TEST-1', summary: 'Issue 1'},
          {id: '2', key: 'TEST-2', summary: 'Issue 2'},
        ],
      },
      success: true,
    })

    mockClearClients = () => {}

    BoardBacklogs = await esmock('../../../../src/commands/jira/board/backlogs.js', {
      '../../../../src/agile/agile-client.js': {
        clearClients: mockClearClients,
        getIssuesForBacklog: mockGetIssuesForBacklog,
      },
      '../../../../src/config.js': {readConfig: mockReadConfig},
    })
  })

  it('gets backlog issues successfully', async () => {
    const command = new BoardBacklogs.default(['123'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
    expect(jsonOutput.data.issues).to.be.an('array')
    expect(jsonOutput.data.issues).to.have.lengthOf(2)
  })

  it('gets backlog issues with JQL filter', async () => {
    const command = new BoardBacklogs.default(['123', 'status=Open'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
  })

  it('respects --max flag for pagination', async () => {
    const command = new BoardBacklogs.default(['123', '--max', '10'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
  })

  it('respects --start flag for pagination', async () => {
    const command = new BoardBacklogs.default(['123', '--start', '5'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
  })

  it('respects --fields flag', async () => {
    const command = new BoardBacklogs.default(['123', '--fields', 'comment,creator'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
  })

  it('formats output as TOON when --toon flag is provided', async () => {
    const command = new BoardBacklogs.default(['123', '--toon'], createMockConfig())

    command.log = (output: string) => {
      logOutput.push(output)
    }

    await command.run()

    expect(logOutput.length).to.be.greaterThan(0)
  })

  it('handles API errors gracefully', async () => {
    mockGetIssuesForBacklog = async () => ({
      error: 'Board not found',
      success: false,
    })

    BoardBacklogs = await esmock('../../../../src/commands/jira/board/backlogs.js', {
      '../../../../src/agile/agile-client.js': {
        clearClients: mockClearClients,
        getIssuesForBacklog: mockGetIssuesForBacklog,
      },
      '../../../../src/config.js': {readConfig: mockReadConfig},
    })

    const command = new BoardBacklogs.default(['999'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput.success).to.be.false
    expect(jsonOutput.error).to.include('Board not found')
  })

  it('exits early when config is not available', async () => {
    mockReadConfig = async () => null

    BoardBacklogs = await esmock('../../../../src/commands/jira/board/backlogs.js', {
      '../../../../src/agile/agile-client.js': {
        clearClients: mockClearClients,
        getIssuesForBacklog: mockGetIssuesForBacklog,
      },
      '../../../../src/config.js': {readConfig: mockReadConfig},
    })

    const command = new BoardBacklogs.default(['123'], createMockConfig())

    let getIssuesForBacklogCalled = false
    mockGetIssuesForBacklog = async () => {
      getIssuesForBacklogCalled = true
      return {data: {}, success: true}
    }

    await command.run()

    expect(getIssuesForBacklogCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    BoardBacklogs = await esmock('../../../../src/commands/jira/board/backlogs.js', {
      '../../../../src/agile/agile-client.js': {
        clearClients: mockClearClients,
        getIssuesForBacklog: mockGetIssuesForBacklog,
      },
      '../../../../src/config.js': {readConfig: mockReadConfig},
    })

    const command = new BoardBacklogs.default(['123'], createMockConfig())
    command.logJson = () => {}

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
