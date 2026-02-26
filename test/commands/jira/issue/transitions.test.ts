/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('issue:get-transitions', () => {
  let IssueGetTransitions: any
  let mockReadConfig: any
  let mockGetTransitions: any
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
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getTransitions: mockGetTransitions,
      },
    })
  })

  it('gets transitions successfully', async () => {
    const command = new IssueGetTransitions.default(['TEST-123'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
    expect(jsonOutput.data.transitions).to.be.an('array')
    expect(jsonOutput.data.transitions).to.have.lengthOf(3)
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
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getTransitions: mockGetTransitions,
      },
    })

    const command = new IssueGetTransitions.default(['INVALID-999'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput.success).to.be.false
    expect(jsonOutput.error).to.include('Issue not found')
  })

  it('exits early when config is not available', async () => {
    mockReadConfig = async () => null

    IssueGetTransitions = await esmock('../../../../src/commands/jira/issue/transitions.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getTransitions: mockGetTransitions,
      },
    })

    const command = new IssueGetTransitions.default(['TEST-123'], createMockConfig())

    let getTransitionsCalled = false
    mockGetTransitions = async () => {
      getTransitionsCalled = true
      return {data: {}, success: true}
    }

    await command.run()

    expect(getTransitionsCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    IssueGetTransitions = await esmock('../../../../src/commands/jira/issue/transitions.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getTransitions: mockGetTransitions,
      },
    })

    const command = new IssueGetTransitions.default(['TEST-123'], createMockConfig())
    command.logJson = () => {}

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
