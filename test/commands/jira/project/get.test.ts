/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('project:get', () => {
  let ProjectGet: any
  let mockCreateProfileManager: any
  let mockGetProject: any
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

    mockGetProject = async () => ({
      data: {
        id: 'PROJ',
        key: 'PROJ',
        name: 'Project Name',
      },
      success: true,
    })

    mockClearClients = () => {}

    ProjectGet = await esmock('../../../../src/commands/jira/project/get.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getProject: mockGetProject,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })
  })

  it('gets project successfully', async () => {
    const command = new ProjectGet.default(['PROJ'], createMockConfig())

    const result = await command.run()

    expect(result).to.not.be.null
    expect(result.success).to.be.true
    expect(result.data.key).to.equal('PROJ')
  })

  it('formats output as TOON when --toon flag is provided', async () => {
    const command = new ProjectGet.default(['PROJ', '--toon'], createMockConfig())

    command.log = (output: string) => {
      logOutput.push(output)
    }

    await command.run()

    expect(logOutput.length).to.be.greaterThan(0)
  })

  it('handles API errors gracefully', async () => {
    mockGetProject = async () => ({
      error: 'Project not found',
      success: false,
    })

    ProjectGet = await esmock('../../../../src/commands/jira/project/get.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getProject: mockGetProject,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new ProjectGet.default(['INVALID'], createMockConfig())

    const result = await command.run()

    expect(result.success).to.be.false
    expect(result.error).to.include('Project not found')
  })

  it('exits early when auth is not available', async () => {
    mockCreateProfileManager = () => ({loadAuthConfig: async () => null})

    ProjectGet = await esmock('../../../../src/commands/jira/project/get.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getProject: mockGetProject,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new ProjectGet.default(['PROJ'], createMockConfig())

    let getProjectCalled = false
    mockGetProject = async () => {
      getProjectCalled = true
      return {data: {}, success: true}
    }

    await command.run().catch(() => {})

    expect(getProjectCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    ProjectGet = await esmock('../../../../src/commands/jira/project/get.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        getProject: mockGetProject,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new ProjectGet.default(['PROJ'], createMockConfig())

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
