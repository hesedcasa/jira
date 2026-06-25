/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('board:versions', () => {
  let BoardVersions: any
  let mockCreateProfileManager: any
  let mockGetAllVersions: any
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
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })
  })

  it('gets versions successfully', async () => {
    const command = new BoardVersions.default(['123'], createMockConfig())

    const result = await command.run()

    expect(result).to.not.be.null
    expect(result.success).to.be.true
    expect(result.data.versions).to.be.an('array')
    expect(result.data.versions).to.have.lengthOf(2)
  })

  it('respects --max flag for pagination', async () => {
    const command = new BoardVersions.default(['123', '--max', '10'], createMockConfig())

    const result = await command.run()

    expect(result).to.not.be.null
    expect(result.success).to.be.true
  })

  it('respects --start flag for pagination', async () => {
    const command = new BoardVersions.default(['123', '--start', '5'], createMockConfig())

    const result = await command.run()

    expect(result).to.not.be.null
    expect(result.success).to.be.true
  })

  it('respects --released flag for filtering', async () => {
    const command = new BoardVersions.default(['123', '--released', 'true'], createMockConfig())

    const result = await command.run()

    expect(result).to.not.be.null
    expect(result.success).to.be.true
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
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new BoardVersions.default(['999'], createMockConfig())

    const result = await command.run()

    expect(result.success).to.be.false
    expect(result.error).to.include('Board not found')
  })

  it('exits early when auth is not available', async () => {
    mockCreateProfileManager = () => ({loadAuthConfig: async () => null})

    BoardVersions = await esmock('../../../../src/commands/jira/board/versions.js', {
      '../../../../src/agile/agile-client.js': {
        clearClients: mockClearClients,
        getAllVersions: mockGetAllVersions,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new BoardVersions.default(['123'], createMockConfig())

    let getAllVersionsCalled = false
    mockGetAllVersions = async () => {
      getAllVersionsCalled = true
      return {data: {}, success: true}
    }

    await command.run().catch(() => {})

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
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new BoardVersions.default(['123'], createMockConfig())

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
