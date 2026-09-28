/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('issue:update', () => {
  let IssueUpdate: any
  let mockCreateProfileManager: any
  let mockUpdateIssue: any
  let mockClearClients: any

  beforeEach(async () => {
    mockCreateProfileManager = () => ({
      loadAuthConfig: async () => ({
        apiToken: 'test-token',
        email: 'test@example.com',
        host: 'https://test.atlassian.net',
      }),
    })

    mockUpdateIssue = async (_config: any, _issueId: string, _fields: any) => ({
      data: {
        id: '10001',
        key: 'TEST-123',
      },
      success: true,
    })

    mockClearClients = () => {}

    IssueUpdate = await esmock('../../../../src/commands/jira/issue/update.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        updateIssue: mockUpdateIssue,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })
  })

  it('updates issue with valid fields', async () => {
    const command = new IssueUpdate.default(
      ['TEST-123', '--fields', 'summary=Updated Summary', '--fields', 'description=Updated Description'],
      createMockConfig(),
    )

    const result = await command.run()

    expect(result).to.not.be.null
    expect(result.success).to.be.true
    expect(result.data).to.have.property('key', 'TEST-123')
  })

  it('parses fields with equals signs in values correctly', async () => {
    let receivedFields: any = null

    mockUpdateIssue = async (_config: any, _issueId: string, fields: any) => {
      receivedFields = fields
      return {
        data: {id: '10001', key: 'TEST-123'},
        success: true,
      }
    }

    IssueUpdate = await esmock('../../../../src/commands/jira/issue/update.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        updateIssue: mockUpdateIssue,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueUpdate.default(
      ['TEST-123', '--fields', 'summary=Test=Summary=With=Equals'],
      createMockConfig(),
    )

    await command.run()

    expect(receivedFields).to.have.property('summary', 'Test=Summary=With=Equals')
  })

  it('passes correct issueId to updateIssue', async () => {
    let receivedIssueId: null | string = null

    mockUpdateIssue = async (_config: any, issueId: string, _fields: any) => {
      receivedIssueId = issueId
      return {
        data: {id: '10001', key: issueId},
        success: true,
      }
    }

    IssueUpdate = await esmock('../../../../src/commands/jira/issue/update.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        updateIssue: mockUpdateIssue,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueUpdate.default(['PROJ-456', '--fields', 'summary=Test'], createMockConfig())

    await command.run()

    expect(receivedIssueId).to.equal('PROJ-456')
  })

  it('handles multiple field updates', async () => {
    let receivedFields: any = null

    mockUpdateIssue = async (_config: any, _issueId: string, fields: any) => {
      receivedFields = fields
      return {
        data: {id: '10001', key: 'TEST-123'},
        success: true,
      }
    }

    IssueUpdate = await esmock('../../../../src/commands/jira/issue/update.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        updateIssue: mockUpdateIssue,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueUpdate.default(
      [
        'TEST-123',
        '--fields',
        'summary=New Summary',
        '--fields',
        'description=New Description',
        '--fields',
        'priority={"name":"High"}',
      ],
      createMockConfig(),
    )

    await command.run()

    expect(receivedFields).to.have.property('summary', 'New Summary')
    expect(receivedFields).to.have.property('description', 'New Description')
    expect(receivedFields).to.have.property('priority', '{"name":"High"}')
  })

  it('handles API errors gracefully', async () => {
    mockUpdateIssue = async () => ({
      error: 'Issue not found',
      success: false,
    })

    IssueUpdate = await esmock('../../../../src/commands/jira/issue/update.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        updateIssue: mockUpdateIssue,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueUpdate.default(['INVALID-999', '--fields', 'summary=Test'], createMockConfig())

    const result = await command.run()

    expect(result.success).to.be.false
    expect(result.error).to.include('Issue not found')
  })

  it('exits early when auth is not available', async () => {
    mockCreateProfileManager = () => ({loadAuthConfig: async () => null})

    IssueUpdate = await esmock('../../../../src/commands/jira/issue/update.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        updateIssue: mockUpdateIssue,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueUpdate.default(['TEST-123', '--fields', 'summary=Test'], createMockConfig())

    let updateIssueCalled = false

    mockUpdateIssue = async () => {
      updateIssueCalled = true
      return {data: {}, success: true}
    }

    await command.run().catch(() => {})

    expect(updateIssueCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    IssueUpdate = await esmock('../../../../src/commands/jira/issue/update.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        updateIssue: mockUpdateIssue,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueUpdate.default(['TEST-123', '--fields', 'summary=Test'], createMockConfig())

    await command.run()

    expect(clearClientsCalled).to.be.true
  })

  it('passes --text-fields as a separate literal map', async () => {
    let receivedFields: any = null
    let receivedTextFields: any = null

    mockUpdateIssue = async (_config: any, _issueId: string, fields: any, textFields: any) => {
      receivedFields = fields
      receivedTextFields = textFields
      return {data: true, success: true}
    }

    IssueUpdate = await esmock('../../../../src/commands/jira/issue/update.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        updateIssue: mockUpdateIssue,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueUpdate.default(
      ['TEST-123', '--text-fields', 'summary={"fix":"login"}', 'description=[1, 2]', '--fields', 'labels=["a"]'],
      createMockConfig(),
    )

    const result = await command.run()

    expect(result.success).to.be.true
    expect(receivedFields).to.deep.equal({labels: '["a"]'})
    expect(receivedTextFields).to.deep.equal({description: '[1, 2]', summary: '{"fix":"login"}'})
  })

  it('keeps everything after the first = in a --text-fields value', async () => {
    let receivedTextFields: any = null

    mockUpdateIssue = async (_config: any, _issueId: string, _fields: any, textFields: any) => {
      receivedTextFields = textFields
      return {data: true, success: true}
    }

    IssueUpdate = await esmock('../../../../src/commands/jira/issue/update.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        updateIssue: mockUpdateIssue,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueUpdate.default(['TEST-123', '--text-fields', 'summary=a=b'], createMockConfig())

    await command.run()

    expect(receivedTextFields).to.deep.equal({summary: 'a=b'})
  })

  it('errors without sending a request when a key is in both --fields and --text-fields', async () => {
    let updateIssueCalled = false
    let errorOutput: null | string = null

    mockUpdateIssue = async () => {
      updateIssueCalled = true
      return {data: true, success: true}
    }

    IssueUpdate = await esmock('../../../../src/commands/jira/issue/update.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        updateIssue: mockUpdateIssue,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueUpdate.default(
      ['TEST-123', '--fields', 'summary=a', '--text-fields', 'summary=b'],
      createMockConfig(),
    )
    command.error = (message: string) => {
      errorOutput = message
      throw new Error(message)
    }

    await command.run().catch(() => {})

    expect(errorOutput).to.include('Field(s) given in both --fields and --text-fields: summary')
    expect(updateIssueCalled).to.be.false
  })

  it('errors when neither --fields nor --text-fields is given', async () => {
    let updateIssueCalled = false
    let errorOutput: null | string = null

    mockUpdateIssue = async () => {
      updateIssueCalled = true
      return {data: true, success: true}
    }

    IssueUpdate = await esmock('../../../../src/commands/jira/issue/update.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        updateIssue: mockUpdateIssue,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueUpdate.default(['TEST-123'], createMockConfig())
    command.error = (message: string) => {
      errorOutput = message
      throw new Error(message)
    }

    await command.run().catch(() => {})

    expect(errorOutput).to.include('At least one of --fields or --text-fields is required')
    expect(updateIssueCalled).to.be.false
  })
})
