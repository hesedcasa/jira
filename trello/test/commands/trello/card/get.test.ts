/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('card:get', () => {
  let CardGet: any
  let mockReadConfig: any
  let mockGetCard: any
  let mockClearClients: any
  let jsonOutput: any

  beforeEach(async () => {
    jsonOutput = null

    mockReadConfig = async () => ({
      auth: {apiKey: 'test-key', apiToken: 'test-token'},
    })

    mockGetCard = async (_config: any, cardId: string) => ({
      data: {
        desc: 'Test Description',
        id: cardId,
        name: 'Test Card',
      },
      success: true,
    })

    mockClearClients = () => {}

    CardGet = await esmock('../../../../src/commands/trello/card/get.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/trello/trello-client.js': {
        clearClients: mockClearClients,
        getCard: mockGetCard,
      },
    })
  })

  it('retrieves card with valid card ID', async () => {
    const command = new CardGet.default(['card123'], createMockConfig())
    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
    expect(jsonOutput.data).to.have.property('id', 'card123')
    expect(jsonOutput.data).to.have.property('name', 'Test Card')
  })

  it('handles API errors gracefully', async () => {
    mockGetCard = async () => ({error: 'Card not found', success: false})

    CardGet = await esmock('../../../../src/commands/trello/card/get.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/trello/trello-client.js': {
        clearClients: mockClearClients,
        getCard: mockGetCard,
      },
    })

    const command = new CardGet.default(['INVALID'], createMockConfig())
    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput.success).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false
    mockClearClients = () => {
      clearClientsCalled = true
    }

    CardGet = await esmock('../../../../src/commands/trello/card/get.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/trello/trello-client.js': {
        clearClients: mockClearClients,
        getCard: mockGetCard,
      },
    })

    const command = new CardGet.default(['card123'], createMockConfig())
    command.logJson = () => {}

    await command.run()
    expect(clearClientsCalled).to.be.true
  })
})
