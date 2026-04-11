/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('list:get', () => {
  let ListGet: any
  let mockReadConfig: any
  let mockGetList: any
  let mockClearClients: any
  let jsonOutput: any

  beforeEach(async () => {
    jsonOutput = null

    mockReadConfig = async () => ({
      auth: {apiKey: 'test-key', apiToken: 'test-token'},
    })

    mockGetList = async (_config: any, listId: string) => ({
      data: {id: listId, name: 'Test List'},
      success: true,
    })

    mockClearClients = () => {}

    ListGet = await esmock('../../../../src/commands/trello/list/get.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/trello/trello-client.js': {
        clearClients: mockClearClients,
        getList: mockGetList,
      },
    })
  })

  it('retrieves list with valid list ID', async () => {
    const command = new ListGet.default(['list123'], createMockConfig())
    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput.success).to.be.true
    expect(jsonOutput.data).to.have.property('id', 'list123')
    expect(jsonOutput.data).to.have.property('name', 'Test List')
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false
    mockClearClients = () => {
      clearClientsCalled = true
    }

    ListGet = await esmock('../../../../src/commands/trello/list/get.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/trello/trello-client.js': {
        clearClients: mockClearClients,
        getList: mockGetList,
      },
    })

    const command = new ListGet.default(['list123'], createMockConfig())
    command.logJson = () => {}

    await command.run()
    expect(clearClientsCalled).to.be.true
  })
})
