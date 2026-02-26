/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('issue:create', () => {
  let IssueCreate: any
  let mockReadConfig: any
  let mockCreateIssue: any
  let mockClearClients: any
  let jsonOutput: any
  let logOutput: string[]
  let errorOutput: null | string

  beforeEach(async () => {
    jsonOutput = null
    logOutput = []
    errorOutput = null

    // Mock successful config read
    mockReadConfig = async () => ({
      auth: {
        apiToken: 'test-token',
        email: 'test@example.com',
        host: 'https://test.atlassian.net',
      },
    })

    // Mock successful createIssue call
    mockCreateIssue = async (_config: any, _fields: any) => ({
      data: {
        id: '10001',
        key: 'TEST-123',
        self: 'https://test.atlassian.net/rest/api/2/issue/10001',
      },
      success: true,
    })

    mockClearClients = () => {}

    // Import with mocks
    IssueCreate = await esmock('../../../../src/commands/jira/issue/create.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        createIssue: mockCreateIssue,
      },
    })
  })

  it('creates issue with all required fields', async () => {
    const command = new IssueCreate.default(
      [
        '--fields',
        'project={"key":"TEST"}',
        '--fields',
        'summary=Test Summary',
        '--fields',
        'description=Test Description',
        '--fields',
        'issuetype={"name":"Task"}',
      ],
      createMockConfig(),
    )

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
    expect(jsonOutput.data).to.have.property('key', 'TEST-123')
  })

  it('parses fields with equals signs in values correctly', async () => {
    let receivedFields: any = null

    mockCreateIssue = async (_config: any, fields: any) => {
      receivedFields = fields
      return {
        data: {id: '10001', key: 'TEST-123'},
        success: true,
      }
    }

    IssueCreate = await esmock('../../../../src/commands/jira/issue/create.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        createIssue: mockCreateIssue,
      },
    })

    const command = new IssueCreate.default(
      [
        '--fields',
        'project={"key":"TEST"}',
        '--fields',
        'summary=Test=Summary',
        '--fields',
        'description=Test Description',
        '--fields',
        'issuetype={"name":"Task"}',
      ],
      createMockConfig(),
    )

    command.logJson = () => {}

    await command.run()

    expect(receivedFields).to.have.property('summary', 'Test=Summary')
  })

  it('throws error when required field "project" is missing', async () => {
    const command = new IssueCreate.default(
      [
        '--fields',
        'summary=Test Summary',
        '--fields',
        'description=Test Description',
        '--fields',
        'issuetype={"name":"Task"}',
      ],
      createMockConfig(),
    )

    command.error = (message: string) => {
      errorOutput = message
      throw new Error(message)
    }

    try {
      await command.run()
    } catch {
      // Expected to throw
    }

    expect(errorOutput).to.include('Required field "project" is missing')
  })

  it('throws error when required field "summary" is missing', async () => {
    const command = new IssueCreate.default(
      [
        '--fields',
        'project={"key":"TEST"}',
        '--fields',
        'description=Test Description',
        '--fields',
        'issuetype={"name":"Task"}',
      ],
      createMockConfig(),
    )

    command.error = (message: string) => {
      errorOutput = message
      throw new Error(message)
    }

    try {
      await command.run()
    } catch {
      // Expected to throw
    }

    expect(errorOutput).to.include('Required field "summary" is missing')
  })

  it('throws error when required field "description" is missing', async () => {
    const command = new IssueCreate.default(
      [
        '--fields',
        'project={"key":"TEST"}',
        '--fields',
        'summary=Test Summary',
        '--fields',
        'issuetype={"name":"Task"}',
      ],
      createMockConfig(),
    )

    command.error = (message: string) => {
      errorOutput = message
      throw new Error(message)
    }

    try {
      await command.run()
    } catch {
      // Expected to throw
    }

    expect(errorOutput).to.include('Required field "description" is missing')
  })

  it('throws error when required field "issuetype" is missing', async () => {
    const command = new IssueCreate.default(
      [
        '--fields',
        'project={"key":"TEST"}',
        '--fields',
        'summary=Test Summary',
        '--fields',
        'description=Test Description',
      ],
      createMockConfig(),
    )

    command.error = (message: string) => {
      errorOutput = message
      throw new Error(message)
    }

    try {
      await command.run()
    } catch {
      // Expected to throw
    }

    expect(errorOutput).to.include('Required field "issuetype" is missing')
  })

  it('formats output as TOON when --toon flag is provided', async () => {
    const command = new IssueCreate.default(
      [
        '--fields',
        'project={"key":"TEST"}',
        '--fields',
        'summary=Test Summary',
        '--fields',
        'description=Test Description',
        '--fields',
        'issuetype={"name":"Task"}',
        '--toon',
      ],
      createMockConfig(),
    )

    command.log = (output: string) => {
      logOutput.push(output)
    }

    await command.run()

    expect(logOutput.length).to.be.greaterThan(0)
    expect(logOutput.join('\n')).to.include('TEST-123')
  })

  it('handles API errors gracefully', async () => {
    mockCreateIssue = async () => ({
      error: 'Permission denied',
      success: false,
    })

    IssueCreate = await esmock('../../../../src/commands/jira/issue/create.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        createIssue: mockCreateIssue,
      },
    })

    const command = new IssueCreate.default(
      [
        '--fields',
        'project={"key":"TEST"}',
        '--fields',
        'summary=Test Summary',
        '--fields',
        'description=Test Description',
        '--fields',
        'issuetype={"name":"Task"}',
      ],
      createMockConfig(),
    )

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput.success).to.be.false
    expect(jsonOutput.error).to.include('Permission denied')
  })

  it('exits early when config is not available', async () => {
    mockReadConfig = async () => null

    IssueCreate = await esmock('../../../../src/commands/jira/issue/create.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        createIssue: mockCreateIssue,
      },
    })

    const command = new IssueCreate.default(
      [
        '--fields',
        'project={"key":"TEST"}',
        '--fields',
        'summary=Test Summary',
        '--fields',
        'description=Test Description',
        '--fields',
        'issuetype={"name":"Task"}',
      ],
      createMockConfig(),
    )

    let createIssueCalled = false

    mockCreateIssue = async () => {
      createIssueCalled = true
      return {data: {}, success: true}
    }

    await command.run()

    expect(createIssueCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    IssueCreate = await esmock('../../../../src/commands/jira/issue/create.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        createIssue: mockCreateIssue,
      },
    })

    const command = new IssueCreate.default(
      [
        '--fields',
        'project={"key":"TEST"}',
        '--fields',
        'summary=Test Summary',
        '--fields',
        'description=Test Description',
        '--fields',
        'issuetype={"name":"Task"}',
      ],
      createMockConfig(),
    )

    command.logJson = () => {}

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
