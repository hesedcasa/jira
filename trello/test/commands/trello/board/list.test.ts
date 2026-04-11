/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('board:list', () => {
  let BoardList: any
  let mockReadConfig: any
  let mockGetMyBoards: any
  let mockClearClients: any
  let jsonOutput: any

  beforeEach(async () => {
    jsonOutput = null

    mockReadConfig = async () => ({
      auth: {apiKey: 'test-key', apiToken: 'test-token'},
    })

    mockGetMyBoards = async () => ({
      data: [
        {id: 'board1', name: 'Board One'},
        {id: 'board2', name: 'Board Two'},
      ],
      success: true,
    })

    mockClearClients = () => {}

    BoardList = await esmock('../../../../src/commands/trello/board/list.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/trello/trello-client.js': {
        clearClients: mockClearClients,
        getMyBoards: mockGetMyBoards,
      },
    })
  })

  it('lists all boards', async () => {
    const command = new BoardList.default([], createMockConfig())
    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput.success).to.be.true
    expect(jsonOutput.data).to.be.an('array')
    expect(jsonOutput.data).to.have.lengthOf(2)
  })

  it('exits early when config is not available', async () => {
    mockReadConfig = async () => null

    BoardList = await esmock('../../../../src/commands/trello/board/list.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/trello/trello-client.js': {
        clearClients: mockClearClients,
        getMyBoards: mockGetMyBoards,
      },
    })

    const command = new BoardList.default([], createMockConfig())
    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()
    expect(jsonOutput).to.be.null
  })
})
