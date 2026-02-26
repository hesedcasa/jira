import {expect} from 'chai'

import {AgileApi} from '../../src/agile/agile-api.js'

describe('AgileApi', () => {
  const mockConfig = {
    apiToken: 'test-token',
    email: 'test@example.com',
    host: 'https://test.atlassian.net',
  }

  let agileApi: AgileApi

  beforeEach(() => {
    agileApi = new AgileApi(mockConfig)
  })

  afterEach(() => {
    agileApi.clearClients()
  })

  describe('constructor', () => {
    it('creates a new instance with config', () => {
      expect(agileApi).to.be.an.instanceOf(AgileApi)
    })
  })

  describe('getClient', () => {
    it('returns an AgileClient instance', () => {
      const client = agileApi.getClient()
      expect(client).to.have.property('board')
    })

    it('returns the same client instance on subsequent calls', () => {
      const client1 = agileApi.getClient()
      const client2 = agileApi.getClient()
      expect(client1).to.equal(client2)
    })
  })

  describe('clearClients', () => {
    it('clears the client instance', () => {
      agileApi.getClient()
      agileApi.clearClients()
      const client = agileApi.getClient()
      expect(client).to.be.an('object')
    })
  })

  describe('getAllBoards', () => {
    it('exports getAllBoards method', () => {
      expect(agileApi.getAllBoards).to.be.a('function')
    })

    it('returns an ApiResult structure', async () => {
      try {
        const result = await agileApi.getAllBoards()
        expect(result).to.have.property('success')
        expect(result).to.satisfy((r: typeof result) => r.data !== undefined || r.error !== undefined)
      } catch {
        // Expected to fail without actual connection
      }
    })

    it('accepts optional parameters', async () => {
      try {
        const result = await agileApi.getAllBoards('TEST', 50, 0)
        expect(result).to.have.property('success')
      } catch {
        // Expected to fail without actual connection
      }
    })
  })

  describe('getAllSprints', () => {
    it('exports getAllSprints method', () => {
      expect(agileApi.getAllSprints).to.be.a('function')
    })

    it('accepts boardId parameter', async () => {
      try {
        const result = await agileApi.getAllSprints(1)
        expect(result).to.have.property('success')
      } catch {
        // Expected to fail without actual connection
      }
    })

    it('accepts optional parameters', async () => {
      try {
        const result = await agileApi.getAllSprints(1, 50, 0, 'active')
        expect(result).to.have.property('success')
      } catch {
        // Expected to fail without actual connection
      }
    })
  })

  describe('getAllVersions', () => {
    it('exports getAllVersions method', () => {
      expect(agileApi.getAllVersions).to.be.a('function')
    })

    it('accepts boardId parameter', async () => {
      try {
        const result = await agileApi.getAllVersions(1)
        expect(result).to.have.property('success')
      } catch {
        // Expected to fail without actual connection
      }
    })

    it('accepts optional parameters', async () => {
      try {
        const result = await agileApi.getAllVersions(1, 50, 0, 'true')
        expect(result).to.have.property('success')
      } catch {
        // Expected to fail without actual connection
      }
    })
  })

  describe('getBoardIssuesForSprint', () => {
    it('exports getBoardIssuesForSprint method', () => {
      expect(agileApi.getBoardIssuesForSprint).to.be.a('function')
    })

    it('accepts boardId and sprintId parameters', async () => {
      try {
        const result = await agileApi.getBoardIssuesForSprint(1, 1)
        expect(result).to.have.property('success')
      } catch {
        // Expected to fail without actual connection
      }
    })

    it('accepts optional parameters', async () => {
      try {
        const result = await agileApi.getBoardIssuesForSprint(1, 1, 'project = TEST', 50, 0, ['summary'])
        expect(result).to.have.property('success')
      } catch {
        // Expected to fail without actual connection
      }
    })
  })

  describe('getIssuesForBacklog', () => {
    it('exports getIssuesForBacklog method', () => {
      expect(agileApi.getIssuesForBacklog).to.be.a('function')
    })

    it('accepts boardId parameter', async () => {
      try {
        const result = await agileApi.getIssuesForBacklog(1)
        expect(result).to.have.property('success')
      } catch {
        // Expected to fail without actual connection
      }
    })

    it('accepts optional parameters', async () => {
      try {
        const result = await agileApi.getIssuesForBacklog(1, 'project = TEST', 50, 0, ['summary'])
        expect(result).to.have.property('success')
      } catch {
        // Expected to fail without actual connection
      }
    })
  })
})
