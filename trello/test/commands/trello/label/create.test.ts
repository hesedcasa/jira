/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('label:create', () => {
  let LabelCreate: any
  let mockReadConfig: any
  let mockCreateLabel: any
  let mockClearClients: any
  let jsonOutput: any

  beforeEach(async () => {
    jsonOutput = null

    mockReadConfig = async () => ({
      auth: {apiKey: 'test-key', apiToken: 'test-token'},
    })

    mockCreateLabel = async () => ({
      data: {color: 'red', id: 'label1', name: 'Bug'},
      success: true,
    })

    mockClearClients = () => {}

    LabelCreate = await esmock('../../../../src/commands/trello/label/create.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/trello/trello-client.js': {
        clearClients: mockClearClients,
        createLabel: mockCreateLabel,
      },
    })
  })

  it('creates a label on a board', async () => {
    const command = new LabelCreate.default(['board123', 'Bug', 'red'], createMockConfig())
    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput.success).to.be.true
    expect(jsonOutput.data).to.have.property('name', 'Bug')
    expect(jsonOutput.data).to.have.property('color', 'red')
  })
})
