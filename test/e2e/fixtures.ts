import {Buffer} from 'node:buffer'
import {randomBytes} from 'node:crypto'

import {E2E_PROJECT, requireEnv} from './helpers.js'

/** One token per mocha process, so concurrent runs never delete each other's fixtures. */
export const RUN_ID = randomBytes(4).toString('hex')
export const RUN_LABEL = `e2e-run-${RUN_ID}`
/** Carried by every fixture ever created, so a crashed run can be reclaimed later. */
export const SHARED_LABEL = 'e2e-cli'

type JiraResponse = {body: unknown; status: number}

async function call(method: string, endpoint: string, body?: unknown): Promise<JiraResponse> {
  const {apiToken, email, host} = requireEnv()
  const authorization = `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`

  const response = await fetch(host + endpoint, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {accept: 'application/json', authorization, 'content-type': 'application/json'},
    method,
  })

  const text = await response.text()
  return {body: text ? JSON.parse(text) : null, status: response.status}
}

/**
 * Creates a fixture issue in the seeded project via the REST API directly.
 *
 * Fixtures are never created through the CLI: they are the oracle the CLI is
 * checked against, so they must not share its code path.
 *
 * @param overrides Extra or replacement issue fields.
 * @returns The created issue key.
 */
export async function seedIssue(overrides: Record<string, unknown> = {}): Promise<string> {
  const {body, status} = await call('POST', '/rest/api/3/issue', {
    fields: {
      issuetype: {name: 'Task'},
      labels: [SHARED_LABEL, RUN_LABEL],
      project: {key: E2E_PROJECT},
      summary: `[e2e ${RUN_ID}] fixture`,
      ...overrides,
    },
  })

  if (status !== 201) {
    throw new Error(`seedIssue failed: ${status} ${JSON.stringify(body)}`)
  }

  return (body as {key: string}).key
}

/**
 * Searches for issues carrying a label.
 *
 * @param label The exact label to match.
 * @param extraJql Optional additional JQL, ANDed onto the label clause.
 * @returns The matching issue keys.
 */
export async function findByLabel(label: string, extraJql = ''): Promise<string[]> {
  const jql = `labels = "${label}"${extraJql ? ` AND ${extraJql}` : ''}`
  const {body, status} = await call('POST', '/rest/api/3/search/jql', {
    fields: ['key'],
    jql,
    maxResults: 100,
  })

  if (status !== 200) {
    throw new Error(`findByLabel failed: ${status} ${JSON.stringify(body)}`)
  }

  return ((body as {issues?: Array<{key: string}>}).issues ?? []).map((issue) => issue.key)
}

/**
 * Polls until the expected number of fixtures is visible to JQL.
 *
 * Jira's search index is asynchronous — a freshly created issue took roughly
 * three seconds to become searchable — so a single search would race.
 *
 * @param label The label to search for.
 * @param expected How many issues should be visible.
 * @returns The keys found, which may be fewer than expected if the deadline passes.
 */
export async function waitForIndexed(label: string, expected: number): Promise<string[]> {
  const deadline = Date.now() + 30_000
  let keys: string[] = []

  while (Date.now() < deadline) {
    // eslint-disable-next-line no-await-in-loop -- sequential polling is the point: each check must follow the previous wait
    keys = await findByLabel(label)
    if (keys.length >= expected) return keys
    // eslint-disable-next-line no-await-in-loop -- see above
    await new Promise((resolve) => {
      setTimeout(resolve, 1000)
    })
  }

  return keys
}

/**
 * Deletes an issue, tolerating one that is already gone.
 *
 * @param key The issue key.
 */
export async function deleteIssue(key: string): Promise<void> {
  const {status} = await call('DELETE', `/rest/api/3/issue/${key}`)
  if (status !== 204 && status !== 404) {
    throw new Error(`deleteIssue ${key} failed: ${status}`)
  }
}

/**
 * Deletes every fixture created by this process.
 */
export async function cleanupRun(): Promise<void> {
  const keys = await findByLabel(RUN_LABEL)
  await Promise.all(keys.map((key) => deleteIssue(key)))
}

/**
 * Deletes fixtures older than an hour, left behind by a crashed run.
 *
 * The age filter is what makes this safe to run while another suite is in
 * flight: it can only ever reclaim fixtures no live run still owns.
 *
 * @returns How many issues were deleted.
 */
export async function sweepStale(): Promise<number> {
  const keys = await findByLabel(SHARED_LABEL, 'created <= "-1h"')
  await Promise.all(keys.map((key) => deleteIssue(key)))
  return keys.length
}
