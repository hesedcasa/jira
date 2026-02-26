/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-params */
import {expect} from 'chai'
import esmock from 'esmock'

describe('agile-client', () => {
  let agileClient: any
  let mockAgileApi: any
  let mockAgileApiInstance: any

  const mockConfig = {
    apiToken: 'test-token',
    email: 'test@example.com',
    host: 'https://test.atlassian.net',
  }

  beforeEach(async () => {
    // Create mock methods that will be assigned to the AgileApi instance
    mockAgileApiInstance = {
      clearClients() {},
      getAllBoards: async () => ({data: {values: []}, success: true}),
      getAllSprints: async () => ({data: {values: []}, success: true}),
      getAllVersions: async () => ({data: {values: []}, success: true}),
      getBoardIssuesForSprint: async () => ({data: {issues: []}, success: true}),
      getIssuesForBacklog: async () => ({data: {issues: []}, success: true}),
    }

    // Mock the AgileApi class constructor
    mockAgileApi = class {
      constructor() {
        Object.assign(this, mockAgileApiInstance)
      }
    }

    // Import with mocked AgileApi
    agileClient = await esmock('../../src/agile/agile-client.js', {
      '../../src/agile/agile-api.js': {AgileApi: mockAgileApi},
    })
  })

  afterEach(() => {
    agileClient.clearClients()
  })

  describe('getAllBoards', () => {
    it('returns successful result with boards list', async () => {
      mockAgileApiInstance.getAllBoards = async () => ({
        data: {
          values: [
            {id: 1, name: 'Test Board', type: 'scrum'},
            {id: 2, name: 'Kanban Board', type: 'kanban'},
          ],
        },
        success: true,
      })

      const result = await agileClient.getAllBoards(mockConfig)

      expect(result.success).to.be.true
      expect(result.data.values).to.be.an('array')
      expect(result.data.values).to.have.lengthOf(2)
      expect(result.data.values[0]).to.have.property('name', 'Test Board')
    })

    it('accepts optional parameters', async () => {
      mockAgileApiInstance.getAllBoards = async (projectKeyOrId?: string, maxResults?: number, startAt?: number) => {
        expect(projectKeyOrId).to.equal('TEST')
        expect(maxResults).to.equal(50)
        expect(startAt).to.equal(0)

        return {
          data: {values: []},
          success: true,
        }
      }

      const result = await agileClient.getAllBoards(mockConfig, 'TEST', 50, 0)

      expect(result.success).to.be.true
    })

    it('handles API errors gracefully', async () => {
      mockAgileApiInstance.getAllBoards = async () => ({
        error: 'Authentication failed',
        success: false,
      })

      const result = await agileClient.getAllBoards(mockConfig)

      expect(result.success).to.be.false
      expect(result.error).to.include('Authentication failed')
    })
  })

  describe('getAllSprints', () => {
    it('returns successful result with sprints list', async () => {
      mockAgileApiInstance.getAllSprints = async () => ({
        data: {
          values: [
            {id: 1, name: 'Sprint 1', state: 'active'},
            {id: 2, name: 'Sprint 2', state: 'closed'},
          ],
        },
        success: true,
      })

      const result = await agileClient.getAllSprints(mockConfig, 1)

      expect(result.success).to.be.true
      expect(result.data.values).to.be.an('array')
      expect(result.data.values).to.have.lengthOf(2)
      expect(result.data.values[0]).to.have.property('state', 'active')
    })

    it('accepts optional parameters', async () => {
      mockAgileApiInstance.getAllSprints = async (
        boardId: number,
        maxResults?: number,
        startAt?: number,
        state?: string,
      ) => {
        expect(boardId).to.equal(1)
        expect(maxResults).to.equal(50)
        expect(startAt).to.equal(0)
        expect(state).to.equal('active')

        return {
          data: {values: []},
          success: true,
        }
      }

      const result = await agileClient.getAllSprints(mockConfig, 1, 50, 0, 'active')

      expect(result.success).to.be.true
    })

    it('handles board not found error', async () => {
      mockAgileApiInstance.getAllSprints = async () => ({
        error: 'Board not found',
        success: false,
      })

      const result = await agileClient.getAllSprints(mockConfig, 999)

      expect(result.success).to.be.false
      expect(result.error).to.include('Board not found')
    })
  })

  describe('getAllVersions', () => {
    it('returns successful result with versions list', async () => {
      mockAgileApiInstance.getAllVersions = async () => ({
        data: {
          values: [
            {id: '1', name: 'v1.0', released: true},
            {id: '2', name: 'v2.0', released: false},
          ],
        },
        success: true,
      })

      const result = await agileClient.getAllVersions(mockConfig, 1)

      expect(result.success).to.be.true
      expect(result.data.values).to.be.an('array')
      expect(result.data.values).to.have.lengthOf(2)
      expect(result.data.values[0]).to.have.property('name', 'v1.0')
    })

    it('accepts optional parameters', async () => {
      mockAgileApiInstance.getAllVersions = async (
        boardId: number,
        maxResults?: number,
        startAt?: number,
        released?: string,
      ) => {
        expect(boardId).to.equal(1)
        expect(maxResults).to.equal(50)
        expect(startAt).to.equal(0)
        expect(released).to.equal('true')

        return {
          data: {values: []},
          success: true,
        }
      }

      const result = await agileClient.getAllVersions(mockConfig, 1, 50, 0, 'true')

      expect(result.success).to.be.true
    })

    it('handles API errors gracefully', async () => {
      mockAgileApiInstance.getAllVersions = async () => ({
        error: 'Permission denied',
        success: false,
      })

      const result = await agileClient.getAllVersions(mockConfig, 1)

      expect(result.success).to.be.false
      expect(result.error).to.include('Permission denied')
    })
  })

  describe('getBoardIssuesForSprint', () => {
    it('returns successful result with sprint issues', async () => {
      mockAgileApiInstance.getBoardIssuesForSprint = async () => ({
        data: {
          issues: [
            {id: '10001', key: 'TEST-1'},
            {id: '10002', key: 'TEST-2'},
          ],
        },
        success: true,
      })

      const result = await agileClient.getBoardIssuesForSprint(mockConfig, 1, 1)

      expect(result.success).to.be.true
      expect(result.data.issues).to.be.an('array')
      expect(result.data.issues).to.have.lengthOf(2)
    })

    it('accepts optional parameters', async () => {
      mockAgileApiInstance.getBoardIssuesForSprint = async (
        boardId: number,
        sprintId: number,
        jql?: string,
        maxResults?: number,
        startAt?: number,
        fields?: string[],
      ) => {
        expect(boardId).to.equal(1)
        expect(sprintId).to.equal(1)
        expect(jql).to.equal('project = TEST')
        expect(maxResults).to.equal(50)
        expect(startAt).to.equal(0)
        expect(fields).to.deep.equal(['summary'])

        return {
          data: {issues: []},
          success: true,
        }
      }

      const result = await agileClient.getBoardIssuesForSprint(mockConfig, 1, 1, 'project = TEST', 50, 0, ['summary'])

      expect(result.success).to.be.true
    })

    it('handles sprint not found error', async () => {
      mockAgileApiInstance.getBoardIssuesForSprint = async () => ({
        error: 'Sprint not found',
        success: false,
      })

      const result = await agileClient.getBoardIssuesForSprint(mockConfig, 1, 999)

      expect(result.success).to.be.false
      expect(result.error).to.include('Sprint not found')
    })
  })

  describe('getIssuesForBacklog', () => {
    it('returns successful result with backlog issues', async () => {
      mockAgileApiInstance.getIssuesForBacklog = async () => ({
        data: {
          issues: [
            {id: '10001', key: 'TEST-1'},
            {id: '10002', key: 'TEST-2'},
            {id: '10003', key: 'TEST-3'},
          ],
        },
        success: true,
      })

      const result = await agileClient.getIssuesForBacklog(mockConfig, 1)

      expect(result.success).to.be.true
      expect(result.data.issues).to.be.an('array')
      expect(result.data.issues).to.have.lengthOf(3)
    })

    it('accepts optional parameters', async () => {
      mockAgileApiInstance.getIssuesForBacklog = async (
        boardId: number,
        jql?: string,
        maxResults?: number,
        startAt?: number,
        fields?: string[],
      ) => {
        expect(boardId).to.equal(1)
        expect(jql).to.equal('project = TEST')
        expect(maxResults).to.equal(50)
        expect(startAt).to.equal(0)
        expect(fields).to.deep.equal(['summary'])

        return {
          data: {issues: []},
          success: true,
        }
      }

      const result = await agileClient.getIssuesForBacklog(mockConfig, 1, 'project = TEST', 50, 0, ['summary'])

      expect(result.success).to.be.true
    })

    it('handles board not found error', async () => {
      mockAgileApiInstance.getIssuesForBacklog = async () => ({
        error: 'Board not found',
        success: false,
      })

      const result = await agileClient.getIssuesForBacklog(mockConfig, 999)

      expect(result.success).to.be.false
      expect(result.error).to.include('Board not found')
    })
  })

  describe('clearClients', () => {
    it('exports clearClients function', () => {
      expect(agileClient.clearClients).to.be.a('function')
    })

    it('can be called without error', () => {
      expect(() => agileClient.clearClients()).to.not.throw()
    })
  })
})
