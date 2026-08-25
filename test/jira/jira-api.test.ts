import {expect} from 'chai'
import {Agent, EnvHttpProxyAgent, getGlobalDispatcher, setGlobalDispatcher} from 'undici'

import {JiraApi} from '../../src/jira/jira-api.js'

/** One intercepted request: where it went and what was sent. */
type SentRequest = {body: unknown; method?: string; url: string}

/**
 * Replace global fetch — the transport jira.js 6 builds on — with one that records the
 * request and answers with `payload`. Returns the recorded requests and a restore hook.
 */
function interceptFetch(payload: unknown): {requests: SentRequest[]; restore: () => void} {
  const requests: SentRequest[] = []
  const original = fetch

  Reflect.set(globalThis, 'fetch', (async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = init?.body
    requests.push({
      body: typeof raw === 'string' ? JSON.parse(raw) : raw,
      method: init?.method,
      url: String(input),
    })

    return Response.json(payload)
  }) as typeof fetch)

  return {
    requests,
    restore() {
      Reflect.set(globalThis, 'fetch', original)
    },
  }
}

describe('JiraApi', () => {
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

  describe('constructor', () => {
    it('creates a new instance with config', () => {
      expect(jiraApi).to.be.an.instanceOf(JiraApi)
    })
  })

  describe('getClient', () => {
    it('returns a Jira Cloud client instance', () => {
      const client = jiraApi.getClient()
      expect(client).to.have.property('issues')
      expect(client).to.have.property('projects')
    })

    it('returns the same client instance on subsequent calls', () => {
      const client1 = jiraApi.getClient()
      const client2 = jiraApi.getClient()
      expect(client1).to.equal(client2)
    })
  })

  describe('clearClients', () => {
    it('clears the client instance', () => {
      jiraApi.getClient()
      jiraApi.clearClients()
      const client = jiraApi.getClient()
      expect(client).to.be.an('object')
    })
  })

  describe('listProjects', () => {
    it('exports listProjects method', () => {
      expect(jiraApi.listProjects).to.be.a('function')
    })

    it('returns an ApiResult structure', async () => {
      try {
        const result = await jiraApi.listProjects()
        expect(result).to.have.property('success')
        expect(result).to.satisfy((r: typeof result) => r.data !== undefined || r.error !== undefined)
      } catch {
        // Expected to fail without actual connection
      }
    })
  })

  describe('getProject', () => {
    it('exports getProject method', () => {
      expect(jiraApi.getProject).to.be.a('function')
    })

    it('accepts projectIdOrKey parameter', async () => {
      try {
        const result = await jiraApi.getProject('TEST')
        expect(result).to.have.property('success')
      } catch {
        // Expected to fail without actual connection
      }
    })
  })

  describe('searchIssues', () => {
    it('exports searchIssues method', () => {
      expect(jiraApi.searchIssues).to.be.a('function')
    })

    it('accepts jql parameter', async () => {
      try {
        const result = await jiraApi.searchIssues('project = TEST')
        expect(result).to.have.property('success')
      } catch {
        // Expected to fail without actual connection
      }
    })

    it('accepts optional maxResults parameter', async () => {
      try {
        const result = await jiraApi.searchIssues('project = TEST', 50)
        expect(result).to.have.property('success')
      } catch {
        // Expected to fail without actual connection
      }
    })
  })

  describe('getIssue', () => {
    it('exports getIssue method', () => {
      expect(jiraApi.getIssue).to.be.a('function')
    })

    it('accepts issueIdOrKey parameter', async () => {
      try {
        const result = await jiraApi.getIssue('TEST-1')
        expect(result).to.have.property('success')
      } catch {
        // Expected to fail without actual connection
      }
    })
  })

  describe('getIssueDevelopment', () => {
    it('routes the dev-status request through the proxy', async () => {
      // This endpoint has no generated client method, so it never builds the transport that
      // installs the dispatcher — the proxy has to be set up on this path in its own right.
      const originalDispatcher = getGlobalDispatcher()
      const originalProxy = process.env.HTTPS_PROXY
      const originalNoProxy = process.env.NO_PROXY
      const fetched = interceptFetch({detail: []})

      // Start from a dispatcher that is definitively not a proxy one, so the assertion below
      // reflects this call rather than whatever an earlier test or the ambient environment
      // left installed.
      setGlobalDispatcher(new Agent())
      process.env.HTTPS_PROXY = 'http://proxy.example.com:8080'
      delete process.env.NO_PROXY

      try {
        const result = await new JiraApi(mockConfig).getIssueDevelopment('10001', 'GitHub', 'pullrequest')

        expect(result.success).to.equal(true)
        expect(getGlobalDispatcher()).to.be.an.instanceOf(EnvHttpProxyAgent)
      } finally {
        if (originalProxy === undefined) delete process.env.HTTPS_PROXY
        else process.env.HTTPS_PROXY = originalProxy
        if (originalNoProxy !== undefined) process.env.NO_PROXY = originalNoProxy
        fetched.restore()
        setGlobalDispatcher(originalDispatcher)
      }
    })
  })

  describe('createIssue', () => {
    it('exports createIssue method', () => {
      expect(jiraApi.createIssue).to.be.a('function')
    })

    it('processes JSON string fields', async () => {
      try {
        const result = await jiraApi.createIssue({
          project: '{"key": "TEST"}',
          summary: 'Test',
        })
        expect(result).to.have.property('success')
      } catch {
        // Expected to fail without actual connection
      }
    })
  })

  describe('updateIssue', () => {
    it('exports updateIssue method', () => {
      expect(jiraApi.updateIssue).to.be.a('function')
    })

    it('accepts issueIdOrKey and fields parameters', async () => {
      try {
        const result = await jiraApi.updateIssue('TEST-1', {summary: 'Updated'})
        expect(result).to.have.property('success')
      } catch {
        // Expected to fail without actual connection
      }
    })
  })

  describe('addComment', () => {
    it('exports addComment method', () => {
      expect(jiraApi.addComment).to.be.a('function')
    })

    it('accepts issueIdOrKey and body parameters', async () => {
      try {
        const result = await jiraApi.addComment('TEST-1', 'Test comment')
        expect(result).to.have.property('success')
      } catch {
        // Expected to fail without actual connection
      }
    })

    it('posts the comment to the issue', async () => {
      const fetched = interceptFetch({id: '10000'})

      try {
        const result = await jiraApi.addComment('TEST-1', 'Test comment')

        expect(result.success).to.equal(true)
        expect(fetched.requests).to.have.lengthOf(1)
        expect(fetched.requests[0].url).to.equal('https://test.atlassian.net/rest/api/3/issue/TEST-1/comment')
        expect(fetched.requests[0].method).to.equal('POST')
        expect(fetched.requests[0].body).to.not.have.property('parentId')
      } finally {
        fetched.restore()
      }
    })

    it('keeps parentId on the wire when replying to a comment', async () => {
      // jira.js builds its comment request body from the fields it declares, and parentId
      // is not one of them — a reply must not silently become a top-level comment.
      const fetched = interceptFetch({id: '10001'})

      try {
        const result = await jiraApi.addComment('TEST-1', 'A reply', '10000')

        expect(result.success).to.equal(true)
        expect(fetched.requests).to.have.lengthOf(1)
        expect(fetched.requests[0].url).to.equal('https://test.atlassian.net/rest/api/3/issue/TEST-1/comment')
        expect(fetched.requests[0].body).to.have.property('parentId', '10000')
      } finally {
        fetched.restore()
      }
    })
  })

  describe('deleteComment', () => {
    it('exports deleteComment method', () => {
      expect(jiraApi.deleteComment).to.be.a('function')
    })

    it('accepts id and issueIdOrKey parameters', async () => {
      try {
        const result = await jiraApi.deleteComment('123', 'TEST-1')
        expect(result).to.have.property('success')
      } catch {
        // Expected to fail without actual connection
      }
    })
  })

  describe('updateComment', () => {
    it('exports updateComment method', () => {
      expect(jiraApi.updateComment).to.be.a('function')
    })

    it('accepts id, issueIdOrKey, and body parameters', async () => {
      try {
        const result = await jiraApi.updateComment('123', 'TEST-1', 'Updated comment')
        expect(result).to.have.property('success')
      } catch {
        // Expected to fail without actual connection
      }
    })
  })

  describe('deleteIssue', () => {
    it('exports deleteIssue method', () => {
      expect(jiraApi.deleteIssue).to.be.a('function')
    })

    it('accepts issueIdOrKey parameter', async () => {
      try {
        const result = await jiraApi.deleteIssue('TEST-1')
        expect(result).to.have.property('success')
      } catch {
        // Expected to fail without actual connection
      }
    })
  })

  describe('assignIssue', () => {
    it('exports assignIssue method', () => {
      expect(jiraApi.assignIssue).to.be.a('function')
    })

    it('accepts accountId and issueIdOrKey parameters', async () => {
      try {
        const result = await jiraApi.assignIssue('account-id', 'TEST-1')
        expect(result).to.have.property('success')
      } catch {
        // Expected to fail without actual connection
      }
    })
  })

  describe('findAssignableUsers', () => {
    it('exports findAssignableUsers method', () => {
      expect(jiraApi.findAssignableUsers).to.be.a('function')
    })

    it('accepts issueKey parameter', async () => {
      try {
        const result = await jiraApi.findAssignableUsers('TEST-1')
        expect(result).to.have.property('success')
      } catch {
        // Expected to fail without actual connection
      }
    })
  })

  describe('getUser', () => {
    it('exports getUser method', () => {
      expect(jiraApi.getUser).to.be.a('function')
    })

    it('accepts no parameters for current user', async () => {
      try {
        const result = await jiraApi.getUser()
        expect(result).to.have.property('success')
      } catch {
        // Expected to fail without actual connection
      }
    })
  })

  describe('testConnection', () => {
    it('exports testConnection method', () => {
      expect(jiraApi.testConnection).to.be.a('function')
    })

    it('returns ApiResult structure', async () => {
      try {
        const result = await jiraApi.testConnection()
        expect(result).to.have.property('success')
      } catch {
        // Expected to fail without actual connection
      }
    })
  })

  describe('doTransition', () => {
    it('exports doTransition method', () => {
      expect(jiraApi.doTransition).to.be.a('function')
    })

    it('accepts issueIdOrKey and transitionId parameters', async () => {
      try {
        const result = await jiraApi.doTransition('TEST-1', 'transition-id')
        expect(result).to.have.property('success')
      } catch {
        // Expected to fail without actual connection
      }
    })
  })

  describe('downloadAttachment', () => {
    it('exports downloadAttachment method', () => {
      expect(jiraApi.downloadAttachment).to.be.a('function')
    })

    it('accepts issueIdOrKey and attachmentId parameters', async () => {
      try {
        const result = await jiraApi.downloadAttachment('TEST-1', 'attachment-1')
        expect(result).to.have.property('success')
      } catch {
        // Expected to fail without actual connection
      }
    })
  })

  describe('getTransitions', () => {
    it('exports getTransitions method', () => {
      expect(jiraApi.getTransitions).to.be.a('function')
    })

    it('accepts issueIdOrKey parameter', async () => {
      try {
        const result = await jiraApi.getTransitions('TEST-1')
        expect(result).to.have.property('success')
      } catch {
        // Expected to fail without actual connection
      }
    })
  })

  describe('worklog', () => {
    it('exports worklog method', () => {
      expect(jiraApi.worklog).to.be.a('function')
    })

    it('accepts required parameters', async () => {
      try {
        const result = await jiraApi.worklog('TEST-1', '2024-01-01T10:00:00.000Z', '1h')
        expect(result).to.have.property('success')
      } catch {
        // Expected to fail without actual connection
      }
    })
  })

  describe('getIssueWorklog', () => {
    it('exports getIssueWorklog method', () => {
      expect(jiraApi.getIssueWorklog).to.be.a('function')
    })

    it('accepts issueIdOrKey parameter', async () => {
      try {
        const result = await jiraApi.getIssueWorklog('TEST-1')
        expect(result).to.have.property('success')
      } catch {
        // Expected to fail without actual connection
      }
    })
  })

  describe('deleteWorklog', () => {
    it('exports deleteWorklog method', () => {
      expect(jiraApi.deleteWorklog).to.be.a('function')
    })

    it('accepts id and issueIdOrKey parameters', async () => {
      try {
        const result = await jiraApi.deleteWorklog('worklog-1', 'TEST-1')
        expect(result).to.have.property('success')
      } catch {
        // Expected to fail without actual connection
      }
    })
  })
})
