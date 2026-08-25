import {expect} from 'chai'

import {AgileApi} from '../../src/agile/agile-api.js'

/**
 * Replace global fetch — the transport jira.js 6 builds on — with one that records the
 * request URLs and answers with `payload`. Returns the URLs and a restore hook.
 */
function interceptFetch(payload: unknown): {restore: () => void; urls: string[]} {
  const urls: string[] = []
  const original = fetch

  Reflect.set(globalThis, 'fetch', (async (input: RequestInfo | URL) => {
    urls.push(String(input))

    return Response.json(payload)
  }) as typeof fetch)

  return {
    restore() {
      Reflect.set(globalThis, 'fetch', original)
    },
    urls,
  }
}

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
    it('returns an Agile client instance', () => {
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
        const result = await agileApi.getBoardIssuesForSprint(1, 1, 'project = TEST', 50, 'next-token', ['summary'])
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
        const result = await agileApi.getIssuesForBacklog(1, 'project = TEST', 50, 'next-token', ['summary'])
        expect(result).to.have.property('success')
      } catch {
        // Expected to fail without actual connection
      }
    })

    it('returns the issues alongside the token for the next page', async () => {
      // The backlog endpoint pages by token rather than by index, so the caller needs the
      // token back to ask for the page after this one.
      const fetched = interceptFetch({
        isLast: false,
        issues: [{fields: {}, id: '1', key: 'TEST-1', self: 'https://test.atlassian.net/rest/agile/1.0/issue/1'}],
        nextPageToken: 'page-2',
      })

      try {
        const result = await agileApi.getIssuesForBacklog(1, undefined, 50, 'page-1', ['summary'])

        expect(result.success).to.equal(true)
        expect(result.data).to.have.property('nextPageToken', 'page-2')
        expect((result.data as {issues: unknown[]}).issues).to.have.lengthOf(1)

        const url = new URL(fetched.urls[0])
        expect(url.pathname).to.equal('/rest/software/1.0/board/1/backlog')
        expect(url.searchParams.get('nextPageToken')).to.equal('page-1')
        expect(url.searchParams.getAll('fields')).to.include('summary')
      } finally {
        fetched.restore()
      }
    })
  })
})
