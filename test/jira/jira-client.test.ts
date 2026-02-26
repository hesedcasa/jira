/* eslint-disable @typescript-eslint/no-explicit-any */
import {expect} from 'chai'
import esmock from 'esmock'

describe('jira-client', () => {
  let jiraClient: any
  let mockJiraApi: any
  let mockJiraApiInstance: any

  const mockConfig = {
    apiToken: 'test-token',
    email: 'test@example.com',
    host: 'https://test.atlassian.net',
  }

  beforeEach(async () => {
    // Create mock methods that will be assigned to the JiraApi instance
    mockJiraApiInstance = {
      addComment: async () => ({data: {id: '10001'}, success: true}),
      addWorklog: async () => ({data: {id: '10001'}, success: true}),
      assignIssue: async () => ({data: {}, success: true}),
      clearClients() {},
      createIssue: async () => ({data: {id: '10001', key: 'TEST-123'}, success: true}),
      deleteComment: async () => ({data: {}, success: true}),
      deleteIssue: async () => ({data: {}, success: true}),
      deleteWorklog: async () => ({data: {}, success: true}),
      doTransition: async () => ({data: {}, success: true}),
      downloadAttachment: async () => ({data: {}, success: true}),
      findAssignableUsers: async () => ({data: [{accountId: 'user1', displayName: 'User 1'}], success: true}),
      getIssue: async () => ({data: {id: '10001', key: 'TEST-123'}, success: true}),
      getIssueWorklog: async () => ({data: {worklogs: []}, success: true}),
      getProject: async () => ({data: {id: '10000', key: 'TEST'}, success: true}),
      getTransitions: async () => ({data: {transitions: []}, success: true}),
      getUser: async () => ({data: {accountId: 'user1'}, success: true}),
      listProjects: async () => ({data: [{id: '10000', key: 'TEST'}], success: true}),
      searchIssues: async () => ({data: {issues: [], total: 0}, success: true}),
      testConnection: async () => ({data: {version: '8.0.0'}, success: true}),
      updateComment: async () => ({data: {id: '10001'}, success: true}),
      updateIssue: async () => ({data: {id: '10001'}, success: true}),
      worklog: async () => ({data: {id: '10001', timeSpent: '1h'}, success: true}),
    }

    // Mock the JiraApi class constructor
    mockJiraApi = class {
      constructor() {
        Object.assign(this, mockJiraApiInstance)
      }
    }

    // Import with mocked JiraApi
    jiraClient = await esmock('../../src/jira/jira-client.js', {
      '../../src/jira/jira-api.js': {JiraApi: mockJiraApi},
    })
  })

  afterEach(() => {
    jiraClient.clearClients()
  })

  describe('listProjects', () => {
    it('returns successful result with projects list', async () => {
      mockJiraApiInstance.listProjects = async () => ({
        data: [
          {id: '10000', key: 'TEST', name: 'Test Project'},
          {id: '10001', key: 'DEMO', name: 'Demo Project'},
        ],
        success: true,
      })

      const result = await jiraClient.listProjects(mockConfig)

      expect(result.success).to.be.true
      expect(result.data).to.be.an('array')
      expect(result.data).to.have.lengthOf(2)
      expect(result.data[0]).to.have.property('key', 'TEST')
    })

    it('handles API errors gracefully', async () => {
      mockJiraApiInstance.listProjects = async () => ({
        error: 'Authentication failed',
        success: false,
      })

      const result = await jiraClient.listProjects(mockConfig)

      expect(result.success).to.be.false
      expect(result.error).to.include('Authentication failed')
    })
  })

  describe('getProject', () => {
    it('returns project details for valid project key', async () => {
      mockJiraApiInstance.getProject = async (projectKey: string) => ({
        data: {
          id: '10000',
          key: projectKey,
          name: 'Test Project',
        },
        success: true,
      })

      const result = await jiraClient.getProject(mockConfig, 'TEST')

      expect(result.success).to.be.true
      expect(result.data).to.have.property('key', 'TEST')
      expect(result.data).to.have.property('name', 'Test Project')
    })

    it('handles project not found error', async () => {
      mockJiraApiInstance.getProject = async () => ({
        error: 'Project not found',
        success: false,
      })

      const result = await jiraClient.getProject(mockConfig, 'INVALID')

      expect(result.success).to.be.false
      expect(result.error).to.include('Project not found')
    })
  })

  describe('searchIssues', () => {
    it('returns search results with issues', async () => {
      mockJiraApiInstance.searchIssues = async () => ({
        data: {
          issues: [
            {id: '10001', key: 'TEST-1'},
            {id: '10002', key: 'TEST-2'},
          ],
          maxResults: 50,
          startAt: 0,
          total: 2,
        },
        success: true,
      })

      const result = await jiraClient.searchIssues(mockConfig, 'project = TEST')

      expect(result.success).to.be.true
      expect(result.data.issues).to.be.an('array')
      expect(result.data.issues).to.have.lengthOf(2)
      expect(result.data.total).to.equal(2)
    })

    it('accepts optional parameters', async () => {
      const result = await jiraClient.searchIssues(mockConfig, 'project = TEST', 50, 'token', ['summary'])

      expect(result.success).to.be.true
    })

    it('handles invalid JQL error', async () => {
      mockJiraApiInstance.searchIssues = async () => ({
        error: 'Invalid JQL query',
        success: false,
      })

      const result = await jiraClient.searchIssues(mockConfig, 'invalid jql')

      expect(result.success).to.be.false
      expect(result.error).to.include('Invalid JQL')
    })
  })

  describe('getIssue', () => {
    it('returns issue details for valid issue key', async () => {
      mockJiraApiInstance.getIssue = async (issueKey: string) => ({
        data: {
          fields: {
            summary: 'Test Issue',
          },
          id: '10001',
          key: issueKey,
        },
        success: true,
      })

      const result = await jiraClient.getIssue(mockConfig, 'TEST-123')

      expect(result.success).to.be.true
      expect(result.data).to.have.property('key', 'TEST-123')
      expect(result.data.fields).to.have.property('summary', 'Test Issue')
    })

    it('handles issue not found error', async () => {
      mockJiraApiInstance.getIssue = async () => ({
        error: 'Issue not found',
        success: false,
      })

      const result = await jiraClient.getIssue(mockConfig, 'INVALID-999')

      expect(result.success).to.be.false
      expect(result.error).to.include('Issue not found')
    })
  })

  describe('createIssue', () => {
    it('creates issue with provided fields', async () => {
      const fields = {
        description: 'Test description',
        issuetype: '{"name":"Task"}',
        project: '{"key":"TEST"}',
        summary: 'Test summary',
      }

      mockJiraApiInstance.createIssue = async () => ({
        data: {
          id: '10001',
          key: 'TEST-123',
        },
        success: true,
      })

      const result = await jiraClient.createIssue(mockConfig, fields)

      expect(result.success).to.be.true
      expect(result.data).to.have.property('key', 'TEST-123')
    })

    it('handles validation errors', async () => {
      mockJiraApiInstance.createIssue = async () => ({
        error: 'Field "summary" is required',
        success: false,
      })

      const result = await jiraClient.createIssue(mockConfig, {})

      expect(result.success).to.be.false
      expect(result.error).to.include('required')
    })
  })

  describe('updateIssue', () => {
    it('updates issue fields successfully', async () => {
      const fields = {
        summary: 'Updated summary',
      }

      mockJiraApiInstance.updateIssue = async () => ({
        data: {
          id: '10001',
          key: 'TEST-123',
        },
        success: true,
      })

      const result = await jiraClient.updateIssue(mockConfig, 'TEST-123', fields)

      expect(result.success).to.be.true
    })

    it('handles update errors', async () => {
      mockJiraApiInstance.updateIssue = async () => ({
        error: 'Permission denied',
        success: false,
      })

      const result = await jiraClient.updateIssue(mockConfig, 'TEST-123', {})

      expect(result.success).to.be.false
      expect(result.error).to.include('Permission denied')
    })
  })

  describe('deleteIssue', () => {
    it('deletes issue successfully', async () => {
      mockJiraApiInstance.deleteIssue = async () => ({
        data: {},
        success: true,
      })

      const result = await jiraClient.deleteIssue(mockConfig, 'TEST-123')

      expect(result.success).to.be.true
    })

    it('handles delete errors', async () => {
      mockJiraApiInstance.deleteIssue = async () => ({
        error: 'Cannot delete issue',
        success: false,
      })

      const result = await jiraClient.deleteIssue(mockConfig, 'TEST-123')

      expect(result.success).to.be.false
    })
  })

  describe('addComment', () => {
    it('adds comment successfully', async () => {
      mockJiraApiInstance.addComment = async () => ({
        data: {
          body: 'Test comment',
          id: '10001',
        },
        success: true,
      })

      const result = await jiraClient.addComment(mockConfig, 'TEST-123', 'Test comment')

      expect(result.success).to.be.true
      expect(result.data).to.have.property('id')
    })
  })

  describe('updateComment', () => {
    it('updates comment successfully', async () => {
      mockJiraApiInstance.updateComment = async () => ({
        data: {
          body: 'Updated comment',
          id: '10001',
        },
        success: true,
      })

      const result = await jiraClient.updateComment(mockConfig, 'TEST-123', '10001', 'Updated comment')

      expect(result.success).to.be.true
    })
  })

  describe('deleteComment', () => {
    it('deletes comment successfully', async () => {
      mockJiraApiInstance.deleteComment = async () => ({
        data: {},
        success: true,
      })

      const result = await jiraClient.deleteComment(mockConfig, 'TEST-123', '10001')

      expect(result.success).to.be.true
    })
  })

  describe('worklog', () => {
    it('adds worklog successfully', async () => {
      mockJiraApiInstance.worklog = async () => ({
        data: {
          id: '10001',
          timeSpent: '1h',
        },
        success: true,
      })

      const result = await jiraClient.worklog(mockConfig, 'TEST-123', '2024-01-01T10:00:00.000+0000', '1h')

      expect(result.success).to.be.true
    })

    it('accepts optional comment parameter', async () => {
      const result = await jiraClient.worklog(mockConfig, 'TEST-123', '2024-01-01T10:00:00.000+0000', '1h', 'Work done')

      expect(result.success).to.be.true
    })
  })

  describe('getIssueWorklog', () => {
    it('returns worklog entries', async () => {
      mockJiraApiInstance.getIssueWorklog = async () => ({
        data: {
          worklogs: [{id: '10001', timeSpent: '1h'}],
        },
        success: true,
      })

      const result = await jiraClient.getIssueWorklog(mockConfig, 'TEST-123')

      expect(result.success).to.be.true
      expect(result.data.worklogs).to.be.an('array')
    })
  })

  describe('deleteWorklog', () => {
    it('deletes worklog successfully', async () => {
      mockJiraApiInstance.deleteWorklog = async () => ({
        data: {},
        success: true,
      })

      const result = await jiraClient.deleteWorklog(mockConfig, 'TEST-123', '10001')

      expect(result.success).to.be.true
    })
  })

  describe('getTransitions', () => {
    it('returns available transitions', async () => {
      mockJiraApiInstance.getTransitions = async () => ({
        data: {
          transitions: [
            {id: '1', name: 'Start Progress'},
            {id: '2', name: 'Done'},
          ],
        },
        success: true,
      })

      const result = await jiraClient.getTransitions(mockConfig, 'TEST-123')

      expect(result.success).to.be.true
      expect(result.data.transitions).to.be.an('array')
      expect(result.data.transitions).to.have.lengthOf(2)
    })
  })

  describe('doTransition', () => {
    it('transitions issue successfully', async () => {
      mockJiraApiInstance.doTransition = async () => ({
        data: {},
        success: true,
      })

      const result = await jiraClient.doTransition(mockConfig, 'TEST-123', '1')

      expect(result.success).to.be.true
    })
  })

  describe('downloadAttachment', () => {
    it('downloads attachment successfully', async () => {
      mockJiraApiInstance.downloadAttachment = async () => ({
        data: {filePath: '/tmp/file.pdf'},
        success: true,
      })

      const result = await jiraClient.downloadAttachment(mockConfig, 'att-123', '/tmp/file.pdf')

      expect(result.success).to.be.true
    })
  })

  describe('assignIssue', () => {
    it('assigns issue successfully', async () => {
      mockJiraApiInstance.assignIssue = async () => ({
        data: {},
        success: true,
      })

      const result = await jiraClient.assignIssue(mockConfig, 'TEST-123', 'user1')

      expect(result.success).to.be.true
    })
  })

  describe('findAssignableUsers', () => {
    it('returns assignable users', async () => {
      mockJiraApiInstance.findAssignableUsers = async () => ({
        data: [
          {accountId: 'user1', displayName: 'User 1'},
          {accountId: 'user2', displayName: 'User 2'},
        ],
        success: true,
      })

      const result = await jiraClient.findAssignableUsers(mockConfig, 'TEST-123')

      expect(result.success).to.be.true
      expect(result.data).to.be.an('array')
      expect(result.data).to.have.lengthOf(2)
    })
  })

  describe('getUser', () => {
    it('returns user details', async () => {
      mockJiraApiInstance.getUser = async () => ({
        data: {
          accountId: 'user1',
          displayName: 'User 1',
          emailAddress: 'user1@example.com',
        },
        success: true,
      })

      const result = await jiraClient.getUser(mockConfig, 'user1')

      expect(result.success).to.be.true
      expect(result.data).to.have.property('accountId', 'user1')
      expect(result.data).to.have.property('displayName')
    })
  })

  describe('testConnection', () => {
    it('successfully tests connection', async () => {
      mockJiraApiInstance.testConnection = async () => ({
        data: {
          serverInfo: {version: '8.0.0'},
        },
        success: true,
      })

      const result = await jiraClient.testConnection(mockConfig)

      expect(result.success).to.be.true
      expect(result.data.serverInfo).to.have.property('version')
    })

    it('handles connection failure', async () => {
      mockJiraApiInstance.testConnection = async () => ({
        error: 'Connection refused',
        success: false,
      })

      const result = await jiraClient.testConnection(mockConfig)

      expect(result.success).to.be.false
      expect(result.error).to.include('Connection refused')
    })
  })

  describe('clearClients', () => {
    it('exports clearClients function', () => {
      expect(jiraClient.clearClients).to.be.a('function')
    })

    it('can be called without error', () => {
      expect(() => jiraClient.clearClients()).to.not.throw()
    })
  })
})
