/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('issue:get-transitions', () => {
  let IssueGetTransitions: any
  let mockCreateProfileManager: any
  let mockGetTransitions: any
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

    mockGetTransitions = async () => ({
      data: {
        transitions: [
          {id: '11', name: 'To Do'},
          {id: '21', name: 'In Progress'},
          {id: '31', name: 'Done'},
        ],
      },
      success: true,
    })

    mockClearClients = () => {}

    IssueGetTransitions = await esmock('../../../../src/commands/jira/issue/transitions.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getTransitions: mockGetTransitions,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })
  })

  it('gets transitions successfully', async () => {
    const command = new IssueGetTransitions.default(['TEST-123'], createMockConfig())

    const result = await command.run()

    expect(result).to.not.be.null
    expect(result.success).to.be.true
    expect(result.data.transitions).to.be.an('array')
    expect(result.data.transitions).to.have.lengthOf(3)
  })

  it('formats output as TOON when --toon flag is provided', async () => {
    const command = new IssueGetTransitions.default(['TEST-123', '--toon'], createMockConfig())

    command.log = (output: string) => {
      logOutput.push(output)
    }

    await command.run()

    expect(logOutput.length).to.be.greaterThan(0)
  })

  it('handles API errors gracefully', async () => {
    mockGetTransitions = async () => ({
      error: 'Issue not found',
      success: false,
    })

    IssueGetTransitions = await esmock('../../../../src/commands/jira/issue/transitions.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getTransitions: mockGetTransitions,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueGetTransitions.default(['INVALID-999'], createMockConfig())

    const result = await command.run()

    expect(result.success).to.be.false
    expect(result.error).to.include('Issue not found')
  })

  it('exits early when auth is not available', async () => {
    mockCreateProfileManager = () => ({loadAuthConfig: async () => null})

    IssueGetTransitions = await esmock('../../../../src/commands/jira/issue/transitions.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getTransitions: mockGetTransitions,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueGetTransitions.default(['TEST-123'], createMockConfig())

    let getTransitionsCalled = false
    mockGetTransitions = async () => {
      getTransitionsCalled = true
      return {data: {}, success: true}
    }

    await command.run().catch(() => {})

    expect(getTransitionsCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    IssueGetTransitions = await esmock('../../../../src/commands/jira/issue/transitions.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getTransitions: mockGetTransitions,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueGetTransitions.default(['TEST-123'], createMockConfig())

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
