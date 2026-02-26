/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable new-cap */
import {expect} from 'chai'
import esmock from 'esmock'

import {createMockConfig} from '../../../helpers/config-mock.js'

describe('issue:download-attachment', () => {
  let IssueDownloadAttachment: any
  let mockReadConfig: any
  let mockDownloadAttachment: any
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

    mockDownloadAttachment = async () => ({
      data: {
        filename: 'test.jpg',
        path: '/tmp/test.jpg',
      },
      success: true,
    })

    mockClearClients = () => {}

    IssueDownloadAttachment = await esmock('../../../../src/commands/jira/issue/attachment-download.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        downloadAttachment: mockDownloadAttachment,
      },
    })
  })

  it('downloads attachment successfully without output path', async () => {
    const command = new IssueDownloadAttachment.default(['TEST-123', '123'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
    expect(jsonOutput.data.filename).to.equal('test.jpg')
  })

  it('downloads attachment successfully with output path', async () => {
    const command = new IssueDownloadAttachment.default(['TEST-123', '123', '/tmp/custom.jpg'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput).to.not.be.null
    expect(jsonOutput.success).to.be.true
  })

  it('formats output as TOON when --toon flag is provided', async () => {
    const command = new IssueDownloadAttachment.default(['TEST-123', '123', '--toon'], createMockConfig())

    command.log = (output: string) => {
      logOutput.push(output)
    }

    await command.run()

    expect(logOutput.length).to.be.greaterThan(0)
  })

  it('handles API errors gracefully', async () => {
    mockDownloadAttachment = async () => ({
      error: 'Attachment not found',
      success: false,
    })

    IssueDownloadAttachment = await esmock('../../../../src/commands/jira/issue/attachment-download.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        downloadAttachment: mockDownloadAttachment,
      },
    })

    const command = new IssueDownloadAttachment.default(['TEST-123', '999'], createMockConfig())

    command.logJson = (output: any) => {
      jsonOutput = output
    }

    await command.run()

    expect(jsonOutput.success).to.be.false
    expect(jsonOutput.error).to.include('Attachment not found')
  })

  it('exits early when config is not available', async () => {
    mockReadConfig = async () => null

    IssueDownloadAttachment = await esmock('../../../../src/commands/jira/issue/attachment-download.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        downloadAttachment: mockDownloadAttachment,
      },
    })

    const command = new IssueDownloadAttachment.default(['TEST-123', '123'], createMockConfig())

    let downloadAttachmentCalled = false
    mockDownloadAttachment = async () => {
      downloadAttachmentCalled = true
      return {data: {}, success: true}
    }

    await command.run()

    expect(downloadAttachmentCalled).to.be.false
  })

  it('calls clearClients after execution', async () => {
    let clearClientsCalled = false

    mockClearClients = () => {
      clearClientsCalled = true
    }

    IssueDownloadAttachment = await esmock('../../../../src/commands/jira/issue/attachment-download.js', {
      '../../../../src/config.js': {readConfig: mockReadConfig},
      '../../../../src/jira/jira-client.js': {
        clearClients: mockClearClients,
        downloadAttachment: mockDownloadAttachment,
      },
    })

    const command = new IssueDownloadAttachment.default(['TEST-123', '123'], createMockConfig())
    command.logJson = () => {}

    await command.run()

    expect(clearClientsCalled).to.be.true
  })
})
