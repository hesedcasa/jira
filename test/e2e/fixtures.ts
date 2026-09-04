import {Buffer} from 'node:buffer'
import {randomBytes} from 'node:crypto'

import {E2E_PROJECT, requireEnv} from './helpers.js'

/**
 * One token per mocha process, so concurrent runs never delete each other's
 * fixtures.
 *
 * E2E_RUN_ID overrides it so a *separate* process can address this run's
 * fixtures by label — `scripts/e2e.sh` and the CI workflow both set it, which
 * is what lets their post-run sweep reclaim fixtures a killed mocha never got
 * to clean up.
 */
export const RUN_ID = process.env.E2E_RUN_ID || randomBytes(4).toString('hex')
export const RUN_LABEL = `e2e-run-${RUN_ID}`
/** Carried by every fixture ever created, so a crashed run can be reclaimed later. */
export const SHARED_LABEL = 'e2e-cli'

type JiraResponse = {body: unknown; status: number}

/**
 * Keys created by this process, as a fallback for `cleanupRun`.
 *
 * Jira's search index is asynchronous, so a JQL lookup alone can miss a
 * fixture created moments earlier and silently leave it behind.
 */
const created = new Set<string>()

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

  const {key} = body as {key: string}
  created.add(key)
  return key
}

/**
 * Searches for issues carrying a label.
 *
 * Always scoped to E2E_PROJECT. Both `cleanupRun` and `sweepStale` are
 * destructive queries driven by ambient environment variables (a label and an
 * age cutoff) with no other guard, so scoping every lookup to the fixture
 * project here — structurally, once — bounds their blast radius to that one
 * project instead of every project the credentials can see.
 *
 * @param label The exact label to match.
 * @param extraJql Optional additional JQL, ANDed onto the label clause.
 * @returns The matching issue keys.
 */
export async function findByLabel(label: string, extraJql = ''): Promise<string[]> {
  const jql = `project = "${E2E_PROJECT}" AND labels = "${label}"${extraJql ? ` AND ${extraJql}` : ''}`
  const keys: string[] = []
  let nextPageToken: string | undefined

  // Every page, not just the first: a caller that stopped at 100 would delete
  // one page of fixtures and report success, leaving the rest in the sandbox.
  do {
    // eslint-disable-next-line no-await-in-loop -- each page's request needs the previous page's token
    const {body, status} = await call('POST', '/rest/api/3/search/jql', {
      fields: ['key'],
      jql,
      maxResults: 100,
      ...(nextPageToken && {nextPageToken}),
    })

    if (status !== 200) {
      throw new Error(`findByLabel failed: ${status} ${JSON.stringify(body)}`)
    }

    const page = body as {issues?: Array<{key: string}>; nextPageToken?: string}
    keys.push(...(page.issues ?? []).map((issue) => issue.key))
    nextPageToken = page.nextPageToken
  } while (nextPageToken)

  return keys
}

/**
 * Polls until the expected number of fixtures is visible to JQL.
 *
 * Jira's search index is asynchronous — a freshly created issue took roughly
 * three seconds to become searchable — so a single search would race.
 *
 * @param label The label to search for.
 * @param expected How many issues should be visible.
 * @returns The keys found.
 * @throws {Error} If the deadline passes before `expected` issues are visible
 *   — a silent return here would let a `before` hook "succeed" with nothing
 *   indexed and defer the real failure into a confusing assertion error later.
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

  throw new Error(`waitForIndexed: expected ${expected} issue(s) labelled "${label}", but saw ${keys.length}`)
}

/**
 * Reads an issue's HTTP status straight from the REST API.
 *
 * An existence check that does not go through JQL, so it is not subject to
 * the search index's lag — 404 means gone, right now.
 *
 * @param key The issue key.
 * @returns The status code: 200 if the issue is there, 404 once it is gone.
 */
export async function issueHttpStatus(key: string): Promise<number> {
  const {status} = await call('GET', `/rest/api/3/issue/${key}?fields=key`)
  return status
}

/**
 * Deletes every issue in `keys`, tolerating individual failures until all
 * deletions have been attempted, then throwing if any actually failed.
 *
 * Promise.all would abandon the remaining deletions on the first rejection;
 * allSettled ensures a single stuck issue never masks failures to delete the
 * rest.
 *
 * @param keys The issue keys to delete.
 */
async function deleteAll(keys: string[]): Promise<void> {
  const results = await Promise.allSettled(keys.map((key) => deleteIssue(key)))
  const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected')
  if (failures.length > 0) {
    throw new Error(
      `deleteAll: ${failures.length}/${keys.length} deletion(s) failed: ${failures.map((f) => String(f.reason)).join('; ')}`,
    )
  }
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

  created.delete(key)
}

/**
 * Deletes every fixture created by this process.
 *
 * Unions the JQL lookup with the keys `seedIssue` recorded, because indexing
 * lags creation by seconds: a suite that seeds an issue and then cleans up
 * immediately would otherwise find nothing and orphan it. The JQL half still
 * matters — with E2E_RUN_ID set, a sweep running in a different process than
 * mocha has an empty `created` set and the label is all it has to go on.
 */
export async function cleanupRun(): Promise<void> {
  const indexed = await findByLabel(RUN_LABEL)
  await deleteAll([...new Set([...indexed, ...created])])
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
  await deleteAll(keys)
  return keys.length
}
