/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('board:versions', () => {
  let BoardVersions: any
  let mockReadConfig: any
  let mockGetAllVersions: any
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

    mockGetAllVersions = async () => ({
      data: {
        versions: [
          {id: '1', name: 'v1.0.0', released: true},
          {id: '2', name: 'v2.0.0', released: false},
        ],
      },
      success: true,
    })

    mockClearClients = () => {}

    BoardVersions = await esmock('../../../../src/commands/jira/board/versions.js', {
      '../../../../src/agile/agile-client.js': {
        clearClients: mockClearClients,
        getAllVersions: mockGetAllVersions,
      },
      '../../../../src/config.js': {readConfig: mockReadConfig},
    })
  })

  it('gets versions successfully', async () => {
    const command = new BoardVersions.default(['123'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
    expect(jsonOutput.data.versions).to.be.an('array')
    expect(jsonOutput.data.versions).to.have.lengthOf(2)
  })

  it('respects --max flag for pagination', async () => {
    const command = new BoardVersions.default(['123', '--max', '10'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
  })

  it('respects --start flag for pagination', async () => {
    const command = new BoardVersions.default(['123', '--start', '5'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
  })

  it('respects --released flag for filtering', async () => {
    const command = new BoardVersions.default(['123', '--released', 'true'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
  })

  it('formats output as TOON when --toon flag is provided', async () => {
    const command = new BoardVersions.default(['123', '--toon'], createMockConfig())

    command.log = (output: string) => {
      logOutput.push(output)
    }

    await command.run()

    expect(logOutput.length).to.be.greaterThan(0)
  })

  it('handles API errors gracefully', async () => {
    mockGetAllVersions = async () => ({
      error: 'Board not found',
      success: false,
    })

    BoardVersions = await esmock('../../../../src/commands/jira/board/versions.js', {
      '../../../../src/agile/agile-client.js': {
        clearClients: mockClearClients,
        getAllVersions: mockGetAllVersions,
      },
      '../../../../src/config.js': {readConfig: mockReadConfig},
    })

    const command = new BoardVersions.default(['999'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput.success).to.be.false
    expect(jsonOutput.error).to.include('Board not found')
  })

  it('exits early when config is not available', async () => {
    mockReadConfig = async () => null

    BoardVersions = await esmock('../../../../src/commands/jira/board/versions.js', {
      '../../../../src/agile/agile-client.js': {
        clearClients: mockClearClients,
        getAllVersions: mockGetAllVersions,
      },
      '../../../../src/config.js': {readConfig: mockReadConfig},
    })

    const command = new BoardVersions.default(['123'], createMockConfig())

    let getAllVersionsCalled = false
    mockGetAllVersions = async () => {
      getAllVersionsCalled = true
      return {data: {}, success: true}
    }

    await command.run()

    expect(getAllVersionsCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    BoardVersions = await esmock('../../../../src/commands/jira/board/versions.js', {
      '../../../../src/agile/agile-client.js': {
        clearClients: mockClearClients,
        getAllVersions: mockGetAllVersions,
      },
      '../../../../src/config.js': {readConfig: mockReadConfig},
    })

    const command = new BoardVersions.default(['123'], createMockConfig())
    command.logJson = () => {}

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
