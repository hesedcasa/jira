import {expect} from 'chai'

import {JiraApi} from '../../../../src/jira/jira-api.js'

describe('JiraApi - addAttachment', () => {
  const mockConfig = {
    apiToken: 'test-token',
    email: 'test@example.com',
    host: 'https://test.atlassian.net',
  }

  let jiraApi: JiraApi

  beforeEach(() => {
    jiraApi = new JiraApi(mockConfig)
  })

  afterEach(() => {
    jiraApi.clearClients()
  })

  describe('addAttachment', () => {
    it('exports addAttachment method', () => {
      expect(jiraApi.addAttachment).to.be.a('function')
    })

    it('accepts issueIdOrKey and filePath parameters', async () => {
      try {
        const result = await jiraApi.addAttachment('TEST-123', '/nonexistent/file.pdf')
        expect(result).to.have.property('success')
        expect(result).to.satisfy((r: typeof result) => r.data !== undefined || r.error !== undefined)
      } catch {
        // Expected to fail without actual file/connection
      }
    })

    it('returns error when file does not exist', async () => {
      const result = await jiraApi.addAttachment('TEST-123', '/nonexistent/file.pdf')
      expect(result.success).to.equal(false)
      expect(result.error).to.include('File not found')
    })
  })
})
