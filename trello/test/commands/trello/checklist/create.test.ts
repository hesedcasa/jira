/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('checklist:create', () => {
  let ChecklistCreate: any
  let mockReadConfig: any
  let mockCreateChecklist: any
  let mockClearClients: any
  let jsonOutput: any

  beforeEach(async () => {
    jsonOutput = null

    mockReadConfig = async () => ({
      auth: {apiKey: 'test-key', apiToken: 'test-token'},
    })

    mockCreateChecklist = async () => ({
      data: {id: 'cl1', name: 'My Checklist'},
      success: true,
    })

    mockClearClients = () => {}

    ChecklistCreate = await esmock('../../../../src/commands/trello/checklist/create.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/trello/trello-client.js': {
        clearClients: mockClearClients,
        createChecklist: mockCreateChecklist,
      },
    })
  })

  it('creates a checklist on a card', async () => {
    const command = new ChecklistCreate.default(['card123', 'My Checklist'], createMockConfig())
    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput.success).to.be.true
    expect(jsonOutput.data).to.have.property('id', 'cl1')
    expect(jsonOutput.data).to.have.property('name', 'My Checklist')
  })
})
