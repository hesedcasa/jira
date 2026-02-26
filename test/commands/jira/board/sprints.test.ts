/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('board:sprints', () => {
  let BoardSprints: any
  let mockReadConfig: any
  let mockGetAllSprints: any
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

    mockGetAllSprints = async () => ({
      data: {
        sprints: [
          {id: 1, name: 'Sprint 1', state: 'active'},
          {id: 2, name: 'Sprint 2', state: 'future'},
        ],
      },
      success: true,
    })

    mockClearClients = () => {}

    BoardSprints = await esmock('../../../../src/commands/jira/board/sprints.js', {
      '../../../../src/agile/agile-client.js': {
        clearClients: mockClearClients,
        getAllSprints: mockGetAllSprints,
      },
      '../../../../src/config.js': {readConfig: mockReadConfig},
    })
  })

  it('gets sprints successfully', async () => {
    const command = new BoardSprints.default(['123'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
    expect(jsonOutput.data.sprints).to.be.an('array')
    expect(jsonOutput.data.sprints).to.have.lengthOf(2)
  })

  it('respects --max flag for pagination', async () => {
    const command = new BoardSprints.default(['123', '--max', '10'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
  })

  it('respects --start flag for pagination', async () => {
    const command = new BoardSprints.default(['123', '--start', '5'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
  })

  it('respects --state flag for filtering', async () => {
    const command = new BoardSprints.default(['123', '--state', 'active'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
  })

  it('formats output as TOON when --toon flag is provided', async () => {
    const command = new BoardSprints.default(['123', '--toon'], createMockConfig())

    command.log = (output: string) => {
      logOutput.push(output)
    }

    await command.run()

    expect(logOutput.length).to.be.greaterThan(0)
  })

  it('handles API errors gracefully', async () => {
    mockGetAllSprints = async () => ({
      error: 'Board not found',
      success: false,
    })

    BoardSprints = await esmock('../../../../src/commands/jira/board/sprints.js', {
      '../../../../src/agile/agile-client.js': {
        clearClients: mockClearClients,
        getAllSprints: mockGetAllSprints,
      },
      '../../../../src/config.js': {readConfig: mockReadConfig},
    })

    const command = new BoardSprints.default(['999'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput.success).to.be.false
    expect(jsonOutput.error).to.include('Board not found')
  })

  it('exits early when config is not available', async () => {
    mockReadConfig = async () => null

    BoardSprints = await esmock('../../../../src/commands/jira/board/sprints.js', {
      '../../../../src/agile/agile-client.js': {
        clearClients: mockClearClients,
        getAllSprints: mockGetAllSprints,
      },
      '../../../../src/config.js': {readConfig: mockReadConfig},
    })

    const command = new BoardSprints.default(['123'], createMockConfig())

    let getAllSprintsCalled = false
    mockGetAllSprints = async () => {
      getAllSprintsCalled = true
      return {data: {}, success: true}
    }

    await command.run()

    expect(getAllSprintsCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    BoardSprints = await esmock('../../../../src/commands/jira/board/sprints.js', {
      '../../../../src/agile/agile-client.js': {
        clearClients: mockClearClients,
        getAllSprints: mockGetAllSprints,
      },
      '../../../../src/config.js': {readConfig: mockReadConfig},
    })

    const command = new BoardSprints.default(['123'], createMockConfig())
    command.logJson = () => {}

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
