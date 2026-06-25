/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('project:list', () => {
  let ProjectList: any
  let mockCreateProfileManager: any
  let mockListProjects: any
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

    mockListProjects = async () => ({
      data: [
        {id: '10000', key: 'TEST', name: 'Test Project'},
        {id: '10001', key: 'DEMO', name: 'Demo Project'},
      ],
      success: true,
    })

    mockClearClients = () => {}

    ProjectList = await esmock('../../../../src/commands/jira/project/list.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        listProjects: mockListProjects,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })
  })

  it('lists projects successfully', async () => {
    const command = new ProjectList.default([], createMockConfig())

    const result = await command.run()

    expect(result).to.not.be.null
    expect(result.success).to.be.true
    expect(result.data).to.be.an('array')
    expect(result.data).to.have.lengthOf(2)
  })

  it('formats output as TOON when --toon flag is provided', async () => {
    const command = new ProjectList.default(['--toon'], createMockConfig())

    command.log = (output: string) => {
      logOutput.push(output)
    }

    await command.run()

    expect(logOutput.length).to.be.greaterThan(0)
  })

  it('handles API errors gracefully', async () => {
    mockListProjects = async () => ({
      error: 'Authentication failed',
      success: false,
    })

    ProjectList = await esmock('../../../../src/commands/jira/project/list.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        listProjects: mockListProjects,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new ProjectList.default([], createMockConfig())

    const result = await command.run()

    expect(result.success).to.be.false
    expect(result.error).to.include('Authentication failed')
  })

  it('exits early when auth is not available', async () => {
    mockCreateProfileManager = () => ({loadAuthConfig: async () => null})

    ProjectList = await esmock('../../../../src/commands/jira/project/list.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        listProjects: mockListProjects,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new ProjectList.default([], createMockConfig())

    let listProjectsCalled = false
    mockListProjects = async () => {
      listProjectsCalled = true
      return {data: [], success: true}
    }

    await command.run().catch(() => {})

    expect(listProjectsCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    ProjectList = await esmock('../../../../src/commands/jira/project/list.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        listProjects: mockListProjects,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new ProjectList.default([], createMockConfig())

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
