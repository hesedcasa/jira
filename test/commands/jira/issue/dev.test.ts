/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('issue:dev', () => {
  let IssueDev: any
  let mockCreateProfileManager: any
  let mockGetIssueDevelopment: any
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

    mockGetIssueDevelopment = async (_config: any, _issueId: string, _applicationType: string, _dataType: string) => ({
      data: {
        detail: [
          {
            repositories: [{commits: [{id: 'abc123', message: 'fix: something'}], name: 'org/repo'}],
          },
        ],
        errors: [],
      },
      success: true,
    })

    mockClearClients = () => {}

    IssueDev = await esmock('../../../../src/commands/jira/issue/dev.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getIssueDevelopment: mockGetIssueDevelopment,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })
  })

  it('retrieves development detail for an issue ID', async () => {
    const command = new IssueDev.default(['12345'], createMockConfig())

    const result = await command.run()

    expect(result).to.not.be.null
    expect(result.success).to.be.true
    expect(result.data).to.have.property('detail')
  })

  it('formats output as TOON when --toon flag is provided', async () => {
    const command = new IssueDev.default(['12345', '--toon'], createMockConfig())

    command.log = (output: string) => {
      logOutput.push(output)
    }

    await command.run()

    expect(logOutput.length).to.be.greaterThan(0)
  })

  it('handles API errors gracefully', async () => {
    mockGetIssueDevelopment = async () => ({
      error: 'Issue not found',
      success: false,
    })

    IssueDev = await esmock('../../../../src/commands/jira/issue/dev.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getIssueDevelopment: mockGetIssueDevelopment,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueDev.default(['99999'], createMockConfig())

    const result = await command.run()

    expect(result.success).to.be.false
    expect(result.error).to.include('Issue not found')
  })

  it('exits early when auth is not available', async () => {
    mockCreateProfileManager = () => ({loadAuthConfig: async () => null})

    IssueDev = await esmock('../../../../src/commands/jira/issue/dev.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getIssueDevelopment: mockGetIssueDevelopment,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueDev.default(['12345'], createMockConfig())
    let apiCalled = false

    mockGetIssueDevelopment = async () => {
      apiCalled = true
      return {data: {}, success: true}
    }

    await command.run().catch(() => {})

    expect(apiCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    IssueDev = await esmock('../../../../src/commands/jira/issue/dev.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getIssueDevelopment: mockGetIssueDevelopment,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueDev.default(['12345'], createMockConfig())

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
