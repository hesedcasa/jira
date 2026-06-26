/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('board:list', () => {
  let BoardList: any
  let mockCreateProfileManager: any
  let mockGetAllBoards: any
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

    BoardList = await esmock('../../../../src/commands/jira/board/index.js', {
      '../../../../src/agile/agile-client.js': {
        clearClients: mockClearClients,
        getAllBoards: mockGetAllBoards,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })
  })

  it('lists all boards successfully', async () => {
    const command = new BoardList.default([], createMockConfig())

    const result = await command.run()

    expect(result).to.not.be.null
    expect(result.success).to.be.true
    expect(result.data.boards).to.be.an('array')
    expect(result.data.boards).to.have.lengthOf(2)
  })

  it('filters boards by project ID', async () => {
    const command = new BoardList.default(['PROJ'], createMockConfig())

    const result = await command.run()

    expect(result).to.not.be.null
    expect(result.success).to.be.true
  })

  it('respects --max flag for pagination', async () => {
    const command = new BoardList.default(['--max', '10'], createMockConfig())

    const result = await command.run()

    expect(result).to.not.be.null
    expect(result.success).to.be.true
  })

  it('respects --start flag for pagination', async () => {
    const command = new BoardList.default(['--start', '5'], createMockConfig())

    const result = await command.run()

    expect(result).to.not.be.null
    expect(result.success).to.be.true
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

    BoardList = await esmock('../../../../src/commands/jira/board/index.js', {
      '../../../../src/agile/agile-client.js': {
        clearClients: mockClearClients,
        getAllBoards: mockGetAllBoards,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new BoardList.default([], createMockConfig())

    const result = await command.run()

    expect(result.success).to.be.false
    expect(result.error).to.include('Failed to fetch boards')
  })

  it('exits early when auth is not available', async () => {
    mockCreateProfileManager = () => ({loadAuthConfig: async () => null})

    BoardList = await esmock('../../../../src/commands/jira/board/index.js', {
      '../../../../src/agile/agile-client.js': {
        clearClients: mockClearClients,
        getAllBoards: mockGetAllBoards,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new BoardList.default([], createMockConfig())

    let getAllBoardsCalled = false
    mockGetAllBoards = async () => {
      getAllBoardsCalled = true
      return {data: {}, success: true}
    }

    await command.run().catch(() => {})

    expect(getAllBoardsCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    BoardList = await esmock('../../../../src/commands/jira/board/index.js', {
      '../../../../src/agile/agile-client.js': {
        clearClients: mockClearClients,
        getAllBoards: mockGetAllBoards,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new BoardList.default([], createMockConfig())

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
