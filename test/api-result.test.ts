import {expect} from 'chai'

import {callJira, errorToApiResult} from '../src/api-result.js'

describe('api-result helpers', () => {
  describe('errorToApiResult', () => {
    it('keeps a plain error message as-is', () => {
      expect(errorToApiResult(new Error('File not found: notes.txt'))).to.deep.equal({
        error: 'File not found: notes.txt',
        success: false,
      })
    })

    it('stringifies a non-Error throw', () => {
      expect(errorToApiResult('boom')).to.deep.equal({error: 'boom', success: false})
    })

    it('adds the HTTP status the message lacks, as jira.js 6.3 AuthError does', () => {
      const error = Object.assign(new Error('Request failed: Jira rejected the credentials'), {status: 401})

      const result = errorToApiResult(error)

      expect(result.success).to.be.false
      expect(result.error).to.include('401')
      expect(result.error).to.include('Jira rejected the credentials')
    })

    it('does not repeat a status the message already carries, as jira.js ApiError does', () => {
      const error = Object.assign(new Error('Request failed: 404 Not Found - {}'), {status: 404})

      expect(errorToApiResult(error).error).to.equal('Request failed: 404 Not Found - {}')
    })
  })

  describe('callJira', () => {
    it('passes a successful call through', async () => {
      const payload = {total: 1, values: ['SS-1']}

      expect(await callJira(async () => payload)).to.equal(payload)
    })

    it('rethrows a non-2xx refusal for the caller to catch', async () => {
      const error = Object.assign(new Error('Request failed: Jira rejected the credentials'), {
        body: undefined,
        status: 401,
      })
      let caught: unknown

      try {
        await callJira(async () => {
          throw error
        })
      } catch (error_: unknown) {
        caught = error_
      }

      expect(caught).to.equal(error)
    })

    it('delivers the body of a 2xx response whose credentials were refused', async () => {
      // Jira serves anonymous callers: a bad token on a list endpoint answers
      // 200 with an empty page and the refusal only in x-seraph-loginreason,
      // which jira.js 6.3 turns into a thrown AuthError.
      const body = {total: 0, values: []}

      const result = await callJira(async () => {
        throw Object.assign(new Error('Request failed: Jira rejected the credentials'), {body, status: 200})
      })

      expect(result).to.equal(body)
    })
  })
})
