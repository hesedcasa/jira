import {expect} from 'chai'

import {cleanupRun, deleteIssue, RUN_ID, RUN_LABEL, SHARED_LABEL} from './fixtures.js'
import {createConfigDir, E2E_PROJECT, removeConfigDir, runCli, runCliJson} from './helpers.js'

type Created = {data: {key: string}; success: boolean}
type Fetched = {
  data: {fields: {assignee: null | {accountId: string}; status: {name: string}; summary: string}}
  success: boolean
}

/** Labels every created issue so the stale sweep can reclaim it if a test dies. */
const LABELS = JSON.stringify([SHARED_LABEL, RUN_LABEL])

describe('e2e: issue lifecycle', () => {
  let configDir: string
  const created: string[] = []

  before(async () => {
    configDir = await createConfigDir()
  })

  // allSettled + finally: a single failed delete must not skip the label-based
  // backstop sweep, nor leave the token-bearing config dir on disk.
  after(async () => {
    try {
      await Promise.allSettled(created.map((key) => deleteIssue(key)))
      await cleanupRun()
    } finally {
      await removeConfigDir(configDir)
    }
  })

  async function createIssue(summary: string): Promise<string> {
    const payload = await runCliJson<Created>(
      [
        'jira',
        'issue',
        'create',
        '--fields',
        `project={"key":"${E2E_PROJECT}"}`,
        '--fields',
        'issuetype={"name":"Task"}',
        '--fields',
        `summary=${summary}`,
        '--fields',
        'description=created by the e2e suite',
        '--fields',
        `labels=${LABELS}`,
      ],
      configDir,
    )
    expect(payload.success).to.be.true
    created.push(payload.data.key)
    return payload.data.key
  }

  it('creates an issue and reads it back', async () => {
    const summary = `[e2e ${RUN_ID}] lifecycle create`
    const key = await createIssue(summary)
    expect(key.startsWith('SS-'), `unexpected key: ${key}`).to.be.true

    const fetched = await runCliJson<Fetched>(['jira', 'issue', key], configDir)
    expect(fetched.success).to.be.true
    expect(fetched.data.fields.summary).to.equal(summary)
  })

  it('updates the summary', async () => {
    const key = await createIssue(`[e2e ${RUN_ID}] lifecycle update`)
    const updated = `[e2e ${RUN_ID}] lifecycle updated`

    const {code} = await runCli(['jira', 'issue', 'update', key, '--fields', `summary=${updated}`], configDir)
    expect(code).to.equal(0)

    const fetched = await runCliJson<Fetched>(['jira', 'issue', key], configDir)
    expect(fetched.data.fields.summary).to.equal(updated)
  })

  it('assigns the issue to an assignable user', async () => {
    const key = await createIssue(`[e2e ${RUN_ID}] lifecycle assign`)

    const assignable = await runCliJson<{data: Array<{accountId: string}>}>(
      ['jira', 'user', 'list-assignable', key],
      configDir,
    )
    expect(assignable.data.length, 'no assignable users on the sandbox').to.be.greaterThan(0)
    const {accountId} = assignable.data[0]

    const {code} = await runCli(['jira', 'issue', 'assign', key, accountId], configDir)
    expect(code).to.equal(0)

    const fetched = await runCliJson<Fetched>(['jira', 'issue', key], configDir)
    expect(fetched.data.fields.assignee?.accountId).to.equal(accountId)
  })

  it('lists transitions and moves the issue', async () => {
    const key = await createIssue(`[e2e ${RUN_ID}] lifecycle transition`)

    const transitions = await runCliJson<{data: {transitions: Array<{id: string; name: string}>}}>(
      ['jira', 'issue', 'transitions', key],
      configDir,
    )
    expect(transitions.data.transitions.length).to.be.greaterThan(0)

    const before = await runCliJson<Fetched>(['jira', 'issue', key], configDir)
    const target = transitions.data.transitions.find((t) => t.name !== before.data.fields.status.name)
    expect(target, 'no transition leads away from the current status').to.exist

    const {code} = await runCli(['jira', 'issue', 'transition', key, target!.id], configDir)
    expect(code).to.equal(0)

    const after = await runCliJson<Fetched>(['jira', 'issue', key], configDir)
    expect(after.data.fields.status.name).to.not.equal(before.data.fields.status.name)
  })

  it('deletes the issue, after which reading it fails', async () => {
    const key = await createIssue(`[e2e ${RUN_ID}] lifecycle delete`)

    const {code} = await runCli(['jira', 'issue', 'delete', key], configDir)
    expect(code).to.equal(0)

    const {code: readCode, stdout} = await runCli(['jira', 'issue', key], configDir)
    expect(readCode).to.equal(1)

    const payload = JSON.parse(stdout) as {error: string; success: boolean}
    expect(payload.success).to.be.false
    expect(payload.error).to.contain('404')
  })
})
