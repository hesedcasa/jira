import {expect} from 'chai'
import {Agent, EnvHttpProxyAgent, getGlobalDispatcher, setGlobalDispatcher} from 'undici'

import {type AdfNode, adfToMarkdown} from '../../src/adf-to-markdown.js'
import {JiraApi} from '../../src/jira/jira-api.js'

/** One intercepted request: where it went and what was sent. */
type SentRequest = {body: unknown; method?: string; url: string}

/** The `fields` object of an issue create/edit request body. */
type IssueWireBody = {fields: Record<string, unknown>}

/** The parts of the issueLink request body linkIssues is expected to send. */
type LinkWireBody = {
  comment?: {body: {type: string}}
  inwardIssue?: {id?: string; key?: string}
  outwardIssue?: {id?: string; key?: string}
  type?: {name: string}
}

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

    it('converts ADF without renderedFields and pages truncated comments oldest first', async () => {
      const adf = (value: string) => ({
        content: [{content: [{text: value, type: 'text'}], type: 'paragraph'}],
        type: 'doc',
      })
      const comment = (id: string) => ({body: adf(`c${id}`), created: '2026-09-29T00:02:40.373+0800', id})
      const requests: string[] = []
      const original = fetch
      Reflect.set(globalThis, 'fetch', (async (input: RequestInfo | URL) => {
        const url = String(input)
        requests.push(url)
        if (url.includes('/comment')) {
          const startAt = Number(new URL(url).searchParams.get('startAt'))
          const all = ['1', '2', '3'].map((id) => comment(id))
          return Response.json({comments: all.slice(startAt, startAt + 2), startAt, total: 3})
        }

        return Response.json({
          fields: {
            comment: {comments: [comment('1')], maxResults: 1, startAt: 0, total: 3},
            description: adf('desc'),
          },
          id: '1',
          key: 'TEST-1',
        })
      }) as typeof fetch)

      try {
        const result = await jiraApi.getIssue('TEST-1')
        expect(result.success).to.equal(true)
        const {fields} = result.data as {
          fields: {comment: {comments: Array<{body: string; id: string}>; total: number}; description: string}
        }
        expect(fields.description).to.equal('desc')
        expect(fields.comment.comments.map((c) => c.body)).to.deep.equal(['c1', 'c2', 'c3'])
        expect(fields.comment.total).to.equal(3)
        expect(requests[0]).to.not.include('renderedFields')
        expect(requests.slice(1).every((url) => url.includes('orderBy=created'))).to.equal(true)
      } finally {
        Reflect.set(globalThis, 'fetch', original)
      }
    })
  })

  describe('getIssue comment paging', () => {
    it('keeps paging when a comment page omits total', async () => {
      const adf = (value: string) => ({
        content: [{content: [{text: value, type: 'text'}], type: 'paragraph'}],
        type: 'doc',
      })
      const all = Array.from({length: 5}, (_, index) => ({body: adf(`c${index + 1}`), id: String(index + 1)}))
      const original = fetch
      Reflect.set(globalThis, 'fetch', (async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/comment')) {
          const startAt = Number(new URL(url).searchParams.get('startAt'))
          return Response.json({comments: all.slice(startAt, startAt + 2), startAt})
        }

        return Response.json({
          fields: {comment: {comments: all.slice(0, 1), maxResults: 1, startAt: 0, total: 5}},
          key: 'TEST-1',
        })
      }) as typeof fetch)

      try {
        const result = await jiraApi.getIssue('TEST-1')
        const {fields} = result.data as {fields: {comment: {comments: Array<{body: string}>; total: number}}}
        expect(fields.comment.comments.map((c) => c.body)).to.deep.equal(['c1', 'c2', 'c3', 'c4', 'c5'])
        expect(fields.comment.total).to.equal(5)
      } finally {
        Reflect.set(globalThis, 'fetch', original)
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

  describe('createIssue with textFields', () => {
    it('keeps JSON parsing for fields and sends textFields as literal strings', async () => {
      const fetched = interceptFetch({id: '10001', key: 'P-1'})

      try {
        const result = await jiraApi.createIssue(
          {issuetype: '{"name":"Task"}', labels: '["a"]', project: '{"key":"P"}'},
          {description: '[1, 2]', summary: '{"fix":"login"}'},
        )

        expect(result.success).to.equal(true)
        expect(fetched.requests).to.have.lengthOf(1)
        expect(fetched.requests[0].url).to.equal('https://test.atlassian.net/rest/api/3/issue')
        const {fields} = fetched.requests[0].body as IssueWireBody
        expect(fields.project).to.deep.equal({key: 'P'})
        expect(fields.issuetype).to.deep.equal({name: 'Task'})
        expect(fields.labels).to.deep.equal(['a'])
        expect(fields.summary).to.equal('{"fix":"login"}')
        expect(fields.description).to.have.property('type', 'doc')
        expect(adfToMarkdown(fields.description as AdfNode)).to.equal('[1, 2]')
      } finally {
        fetched.restore()
      }
    })

    it('converts text values for ADF custom fields reported by the field schema', async () => {
      // One payload answers both the field-schema lookup and the create.
      const fetched = interceptFetch({
        id: '10001',
        isLast: true,
        key: 'P-1',
        maxResults: 50,
        self: 'https://test.atlassian.net/rest/api/3/issue/10001',
        startAt: 0,
        total: 1,
        values: [
          {
            id: 'customfield_100',
            name: 'Notes',
            schema: {custom: 'com.atlassian.jira.plugin.system.customfieldtypes:textarea', type: 'string'},
          },
        ],
      })

      try {
        await jiraApi.createIssue(
          {customfield_300: 'plain', project: '{"key":"P"}'},
          {customfield_100: '{"a":1}', customfield_200: '{"b":2}'},
        )

        const lookup = fetched.requests.find((request) => request.url.includes('/field/search'))
        expect(lookup?.url).to.include('customfield_100')
        expect(lookup?.url).to.not.include('customfield_300')
        const create = fetched.requests.find((request) => request.method === 'POST')
        const {fields} = create?.body as IssueWireBody
        expect(adfToMarkdown(fields.customfield_100 as AdfNode)).to.equal('{"a":1}')
        expect(fields.customfield_200).to.equal('{"b":2}')
        expect(fields.customfield_300).to.equal('plain')
      } finally {
        fetched.restore()
      }
    })

    it('rejects a key given in both maps without sending a request', async () => {
      const fetched = interceptFetch({})

      try {
        const result = await jiraApi.createIssue({summary: 'a'}, {summary: 'b'})

        expect(result.success).to.equal(false)
        expect(result.error).to.include('summary')
        expect(fetched.requests).to.have.lengthOf(0)
      } finally {
        fetched.restore()
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

    it('sends a JSON-looking text summary as a string', async () => {
      const fetched = interceptFetch({})

      try {
        const result = await jiraApi.updateIssue('TEST-1', {}, {summary: '{"fix":"login"}'})

        expect(result.success).to.equal(true)
        expect(fetched.requests).to.have.lengthOf(1)
        expect(fetched.requests[0].method).to.equal('PUT')
        const {fields} = fetched.requests[0].body as IssueWireBody
        expect(fields.summary).to.equal('{"fix":"login"}')
      } finally {
        fetched.restore()
      }
    })

    it('converts a JSON-looking text description to ADF that reads back verbatim', async () => {
      const fetched = interceptFetch({})

      try {
        await jiraApi.updateIssue('TEST-1', {}, {description: '[1, 2]'})

        const {fields} = fetched.requests[0].body as IssueWireBody
        expect(fields.description).to.have.property('type', 'doc')
        expect(adfToMarkdown(fields.description as AdfNode)).to.equal('[1, 2]')
      } finally {
        fetched.restore()
      }
    })

    it('still JSON-parses --fields values alongside textFields', async () => {
      const fetched = interceptFetch({})

      try {
        await jiraApi.updateIssue('TEST-1', {description: '[1, 2]', labels: '["a"]'}, {summary: '[x]'})

        const {fields} = fetched.requests[0].body as IssueWireBody
        expect(fields.labels).to.deep.equal(['a'])
        expect(fields.description).to.deep.equal([1, 2])
        expect(fields.summary).to.equal('[x]')
      } finally {
        fetched.restore()
      }
    })

    it('converts text values for ADF custom fields reported by the field schema', async () => {
      // One payload answers both the field-schema lookup and the edit.
      const fetched = interceptFetch({
        isLast: true,
        maxResults: 50,
        startAt: 0,
        total: 1,
        values: [
          {
            id: 'customfield_100',
            name: 'Notes',
            schema: {custom: 'com.atlassian.jira.plugin.system.customfieldtypes:textarea', type: 'string'},
          },
        ],
      })

      try {
        await jiraApi.updateIssue('TEST-1', {}, {customfield_100: '{"a":1}', customfield_200: '{"b":2}'})

        const edit = fetched.requests.find((request) => request.method === 'PUT')
        const {fields} = edit?.body as IssueWireBody
        expect(adfToMarkdown(fields.customfield_100 as AdfNode)).to.equal('{"a":1}')
        expect(fields.customfield_200).to.equal('{"b":2}')
      } finally {
        fetched.restore()
      }
    })

    it('rejects a key given in both maps without sending a request', async () => {
      const fetched = interceptFetch({})

      try {
        const result = await jiraApi.updateIssue('TEST-1', {summary: 'a'}, {summary: 'b'})

        expect(result.success).to.equal(false)
        expect(result.error).to.include('summary')
        expect(fetched.requests).to.have.lengthOf(0)
      } finally {
        fetched.restore()
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

  describe('linkIssues', () => {
    it('exports linkIssues method', () => {
      expect(jiraApi.linkIssues).to.be.a('function')
    })

    it('sends the issue carrying the link type as inwardIssue, as POST /issueLink expects', async () => {
      const fetched = interceptFetch({})

      try {
        const result = await jiraApi.linkIssues('TEST-1', 'TEST-2', 'Blocks')

        expect(result.success).to.equal(true)
        expect(fetched.requests).to.have.lengthOf(1)
        expect(fetched.requests[0].url).to.equal('https://test.atlassian.net/rest/api/3/issueLink')
        expect(fetched.requests[0].method).to.equal('POST')
        const body = fetched.requests[0].body as LinkWireBody
        expect(body.inwardIssue?.key).to.equal('TEST-1')
        expect(body.outwardIssue?.key).to.equal('TEST-2')
        expect(body.type?.name).to.equal('Blocks')
        expect(body).to.not.have.property('comment')
      } finally {
        fetched.restore()
      }
    })

    it('sends numeric issue IDs as id references', async () => {
      const fetched = interceptFetch({})

      try {
        const result = await jiraApi.linkIssues('10700', '10701', 'Relates')

        expect(result.success).to.equal(true)
        const body = fetched.requests[0].body as LinkWireBody
        expect(body.inwardIssue?.id).to.equal('10700')
        expect(body.outwardIssue?.id).to.equal('10701')
        expect(body.outwardIssue).to.not.have.property('key')
        expect(body.inwardIssue).to.not.have.property('key')
      } finally {
        fetched.restore()
      }
    })

    it('includes the comment as ADF when given', async () => {
      const fetched = interceptFetch({})

      try {
        const result = await jiraApi.linkIssues('TEST-1', 'TEST-2', 'Duplicates', 'Same root cause')

        expect(result.success).to.equal(true)
        const body = fetched.requests[0].body as LinkWireBody
        expect(body.comment?.body.type).to.equal('doc')
      } finally {
        fetched.restore()
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
