/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('issue:transition', () => {
  let IssueTransition: any
  let mockReadConfig: any
  let mockDoTransition: any
  let mockClearClients: any
  let jsonOutput: any

  beforeEach(async () => {
    jsonOutput = null

    mockReadConfig = async () => ({
      auth: {
        apiToken: 'test-token',
        email: 'test@example.com',
        host: 'https://test.atlassian.net',
      },
    })

    mockDoTransition = async () => ({
      data: {},
      success: true,
    })

    mockClearClients = () => {}

    IssueTransition = await esmock('../../../../src/commands/jira/issue/transition.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        doTransition: mockDoTransition,
      },
    })
  })

  it('transitions issue successfully', async () => {
    const command = new IssueTransition.default(['TEST-123', '11'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
  })

  it('handles API errors gracefully', async () => {
    mockDoTransition = async () => ({
      error: 'Invalid transition',
      success: false,
    })

    IssueTransition = await esmock('../../../../src/commands/jira/issue/transition.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        doTransition: mockDoTransition,
      },
    })

    const command = new IssueTransition.default(['TEST-123', '999'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput.success).to.be.false
    expect(jsonOutput.error).to.include('Invalid transition')
  })

  it('exits early when config is not available', async () => {
    mockReadConfig = async () => null

    IssueTransition = await esmock('../../../../src/commands/jira/issue/transition.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        doTransition: mockDoTransition,
      },
    })

    const command = new IssueTransition.default(['TEST-123', '11'], createMockConfig())

    let doTransitionCalled = false
    mockDoTransition = async () => {
      doTransitionCalled = true
      return {data: {}, success: true}
    }

    await command.run()

    expect(doTransitionCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    IssueTransition = await esmock('../../../../src/commands/jira/issue/transition.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        doTransition: mockDoTransition,
      },
    })

    const command = new IssueTransition.default(['TEST-123', '11'], createMockConfig())
    command.logJson = () => {}

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
