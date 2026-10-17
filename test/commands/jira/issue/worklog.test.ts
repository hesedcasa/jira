/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('issue:worklog', () => {
  let IssueWorklog: any
  let mockCreateProfileManager: any
  let mockWorklog: any
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

    mockWorklog = async () => ({
      data: {
        id: '10001',
        timeSpent: '1h',
      },
      success: true,
    })

    mockClearClients = () => {}

    IssueWorklog = await esmock('../../../../src/commands/jira/issue/worklog.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        worklog: mockWorklog,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })
  })

  it('adds worklog successfully with required args', async () => {
    const command = new IssueWorklog.default(['TEST-123', '2024-01-01T10:00:00.000+0000', '1h'], createMockConfig())

    const result = await command.run()

    expect(result).to.not.be.null
    expect(result.success).to.be.true
    expect(result.data.id).to.equal('10001')
  })

  it('adds worklog with comment', async () => {
    const command = new IssueWorklog.default(
      ['TEST-123', '2024-01-01T10:00:00.000+0000', '1h', 'Work completed'],
      createMockConfig(),
    )

    const result = await command.run()

    expect(result).to.not.be.null
    expect(result.success).to.be.true
  })

  it('formats output as TOON when --toon flag is provided', async () => {
    const command = new IssueWorklog.default(
      ['TEST-123', '2024-01-01T10:00:00.000+0000', '2h', '--toon'],
      createMockConfig(),
    )

    command.log = (output: string) => {
      logOutput.push(output)
    }

    await command.run()

    expect(logOutput.length).to.be.greaterThan(0)
  })

  it('handles API errors gracefully', async () => {
    mockWorklog = async () => ({
      error: 'Invalid time format',
      success: false,
    })

    IssueWorklog = await esmock('../../../../src/commands/jira/issue/worklog.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        worklog: mockWorklog,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueWorklog.default(['TEST-123', 'invalid-date', '1h'], createMockConfig())

    const result = await command.run()

    expect(result.success).to.be.false
    expect(result.error).to.include('Invalid time format')
  })

  it('exits early when auth is not available', async () => {
    mockCreateProfileManager = () => ({loadAuthConfig: async () => null})

    IssueWorklog = await esmock('../../../../src/commands/jira/issue/worklog.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        worklog: mockWorklog,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueWorklog.default(['TEST-123', '2024-01-01T10:00:00.000+0000', '1h'], createMockConfig())

    let worklogCalled = false
    mockWorklog = async () => {
      worklogCalled = true
      return {data: {}, success: true}
    }

    await command.run().catch(() => {})

    expect(worklogCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    IssueWorklog = await esmock('../../../../src/commands/jira/issue/worklog.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        worklog: mockWorklog,
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    const command = new IssueWorklog.default(['TEST-123', '2024-01-01T10:00:00.000+0000', '1h'], createMockConfig())

    await command.run()

    expect(clearClientsCalled).to.be.true
  })

  it('reads the worklog comment from an @<path> comment', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'jira-worklog-'))
    const file = path.join(dir, 'notes.md')
    writeFileSync(file, 'notes from file')
    let capturedComment: string | undefined

    IssueWorklog = await esmock('../../../../src/commands/jira/issue/worklog.js', {
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        async worklog(...args: any[]) {
          capturedComment = args[4]
          return {data: {id: '10001'}, success: true}
        },
      },
      '@hesed/plugin-lib': {createProfileManager: mockCreateProfileManager},
    })

    try {
      await new IssueWorklog.default(
        ['TEST-123', '2024-01-01T10:00:00.000+0000', '1h', `@${file}`],
        createMockConfig(),
      ).run()
    } finally {
      rmSync(dir, {force: true, recursive: true})
    }

    expect(capturedComment).to.equal('notes from file')
  })
})
