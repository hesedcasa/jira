/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('comment:add', () => {
  let CommentAdd: any
  let mockReadConfig: any
  let mockAddCardComment: any
  let mockClearClients: any
  let jsonOutput: any

  beforeEach(async () => {
    jsonOutput = null

    mockReadConfig = async () => ({
      auth: {apiKey: 'test-key', apiToken: 'test-token'},
    })

    mockAddCardComment = async () => ({
      data: {id: 'action1', type: 'commentCard'},
      success: true,
    })

    mockClearClients = () => {}

    CommentAdd = await esmock('../../../../src/commands/trello/comment/add.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/trello/trello-client.js': {
        addCardComment: mockAddCardComment,
        clearClients: mockClearClients,
      },
    })
  })

  it('adds a comment to a card', async () => {
    const command = new CommentAdd.default(['card123', 'Test comment'], createMockConfig())
    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput.success).to.be.true
    expect(jsonOutput.data).to.have.property('id', 'action1')
  })

  it('exits early when config is not available', async () => {
    mockReadConfig = async () => null

    CommentAdd = await esmock('../../../../src/commands/trello/comment/add.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/trello/trello-client.js': {
        addCardComment: mockAddCardComment,
        clearClients: mockClearClients,
      },
    })

    const command = new CommentAdd.default(['card123', 'Test comment'], createMockConfig())
    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()
    expect(jsonOutput).to.be.null
  })
})
