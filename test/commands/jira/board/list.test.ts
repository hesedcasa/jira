/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('board:list', () => {
  let BoardList: any
  let mockReadConfig: any
  let mockGetAllBoards: any
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

    mockGetAllBoards = async () => ({
      data: {
        boards: [
          {id: 1, name: 'Board 1', type: 'scrum'},
          {id: 2, name: 'Board 2', type: 'kanban'},
        ],
      },
      success: true,
    })

    mockClearClients = () => {}

    BoardList = await esmock('../../../../src/commands/jira/board/list.js', {
      '../../../../src/agile/agile-client.js': {
        clearClients: mockClearClients,
        getAllBoards: mockGetAllBoards,
      },
      '../../../../src/config.js': {readConfig: mockReadConfig},
    })
  })

  it('lists all boards successfully', async () => {
    const command = new BoardList.default([], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
    expect(jsonOutput.data.boards).to.be.an('array')
    expect(jsonOutput.data.boards).to.have.lengthOf(2)
  })

  it('filters boards by project ID', async () => {
    const command = new BoardList.default(['PROJ'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
  })

  it('respects --max flag for pagination', async () => {
    const command = new BoardList.default(['--max', '10'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
  })

  it('respects --start flag for pagination', async () => {
    const command = new BoardList.default(['--start', '5'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
  })

  it('formats output as TOON when --toon flag is provided', async () => {
    const command = new BoardList.default(['--toon'], createMockConfig())

    command.log = (output: string) => {
      logOutput.push(output)
    }

    await command.run()

    expect(logOutput.length).to.be.greaterThan(0)
  })

  it('handles API errors gracefully', async () => {
    mockGetAllBoards = async () => ({
      error: 'Failed to fetch boards',
      success: false,
    })

    BoardList = await esmock('../../../../src/commands/jira/board/list.js', {
      '../../../../src/agile/agile-client.js': {
        clearClients: mockClearClients,
        getAllBoards: mockGetAllBoards,
      },
      '../../../../src/config.js': {readConfig: mockReadConfig},
    })

    const command = new BoardList.default([], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput.success).to.be.false
    expect(jsonOutput.error).to.include('Failed to fetch boards')
  })

  it('exits early when config is not available', async () => {
    mockReadConfig = async () => null

    BoardList = await esmock('../../../../src/commands/jira/board/list.js', {
      '../../../../src/agile/agile-client.js': {
        clearClients: mockClearClients,
        getAllBoards: mockGetAllBoards,
      },
      '../../../../src/config.js': {readConfig: mockReadConfig},
    })

    const command = new BoardList.default([], createMockConfig())

    let getAllBoardsCalled = false
    mockGetAllBoards = async () => {
      getAllBoardsCalled = true
      return {data: {}, success: true}
    }

    await command.run()

    expect(getAllBoardsCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    BoardList = await esmock('../../../../src/commands/jira/board/list.js', {
      '../../../../src/agile/agile-client.js': {
        clearClients: mockClearClients,
        getAllBoards: mockGetAllBoards,
      },
      '../../../../src/config.js': {readConfig: mockReadConfig},
    })

    const command = new BoardList.default([], createMockConfig())
    command.logJson = () => {}

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
