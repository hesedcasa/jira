import {expect} from 'chai'

import {cleanupRun, RUN_ID, RUN_LABEL, seedIssue, waitForIndexed} from './fixtures.js'
import {
  createConfigDir,
  E2E_BOARD_ID,
  E2E_EMPTY_PROJECT,
  E2E_PROJECT,
  E2E_SPRINT_ID,
  removeConfigDir,
  runCliJson,
  runCliOk,
} from './helpers.js'

type Issue = {fields: Record<string, unknown>; key: string}
type Paged<T> = {isLast: boolean; maxResults: number; startAt: number; total: number; values: T[]}

describe('e2e: read paths', () => {
  let configDir: string
  let seededKey: string
  let secondKey: string

  // Two fixtures, not one: with a single issue in the project a `--max 1`
  // assertion passes whether or not --max works.
  before(async () => {
    configDir = await createConfigDir()
    seededKey = await seedIssue()
    secondKey = await seedIssue()
    await waitForIndexed(RUN_LABEL, 2)
  })

  after(async () => {
    await cleanupRun()
    await removeConfigDir(configDir)
  })

  it('lists both sandbox projects', async () => {
    const payload = await runCliJson<{data: Array<{key: string}>}>(['jira', 'project', 'list'], configDir)
    const keys = payload.data.map((project) => project.key)
    expect(keys).to.include(E2E_PROJECT)
    expect(keys).to.include(E2E_EMPTY_PROJECT)
  })

  it('gets a single project', async () => {
    const payload = await runCliJson<{data: {key: string}; success: boolean}>(
      ['jira', 'project', E2E_PROJECT],
      configDir,
    )
    expect(payload.success).to.be.true
    expect(payload.data.key).to.equal(E2E_PROJECT)
  })

  it('lists boards', async () => {
    const payload = await runCliJson<{data: Paged<{id: number}>}>(['jira', 'board'], configDir)
    expect(payload.data.values.map((board) => board.id)).to.include(E2E_BOARD_ID)
  })

  // Asserted on id and shape, not display name: boards cannot be created via
  // REST, so these are pre-existing fixtures a rename must not break.
  it('lists sprints on the board', async () => {
    const payload = await runCliJson<{data: Paged<{id: number; state: string}>}>(
      ['jira', 'board', 'sprints', String(E2E_BOARD_ID)],
      configDir,
    )
    const sprint = payload.data.values.find((candidate) => candidate.id === E2E_SPRINT_ID)
    expect(sprint, `sprint ${E2E_SPRINT_ID} missing`).to.exist
    expect(sprint!.state).to.be.a('string')
  })

  it('returns a well-formed backlog', async () => {
    const payload = await runCliJson<{data: {issues: Issue[]}; success: boolean}>(
      ['jira', 'board', 'backlogs', String(E2E_BOARD_ID)],
      configDir,
    )
    expect(payload.success).to.be.true
    expect(payload.data.issues).to.be.an('array')
  })

  it('returns well-formed versions', async () => {
    const payload = await runCliJson<{data: Paged<unknown>; success: boolean}>(
      ['jira', 'board', 'versions', String(E2E_BOARD_ID)],
      configDir,
    )
    expect(payload.success).to.be.true
    expect(payload.data.values).to.be.an('array')
  })

  it('finds the seeded issues by JQL', async () => {
    const payload = await runCliJson<{data: {issues: Issue[]}}>(
      ['jira', 'issue', 'search', `labels = "${RUN_LABEL}"`],
      configDir,
    )
    const keys = payload.data.issues.map((issue) => issue.key)
    expect(keys).to.include(seededKey)
    expect(keys).to.include(secondKey)
  })

  it('returns an empty issue list for the empty project and still exits 0', async () => {
    const payload = await runCliJson<{data: {issues: Issue[]}; success: boolean}>(
      ['jira', 'issue', 'search', `project = ${E2E_EMPTY_PROJECT}`],
      configDir,
    )
    expect(payload.success).to.be.true
    expect(payload.data.issues).to.deep.equal([])
  })

  // Scoped to the run label so the count is deterministic, and paired with an
  // unbounded search so the capped result is only reachable if --max works.
  it('honours --max', async () => {
    const unbounded = await runCliJson<{data: {issues: Issue[]}}>(
      ['jira', 'issue', 'search', `labels = "${RUN_LABEL}"`],
      configDir,
    )
    expect(unbounded.data.issues, 'both fixtures should be visible').to.have.lengthOf(2)

    const capped = await runCliJson<{data: {issues: Issue[]}}>(
      ['jira', 'issue', 'search', `labels = "${RUN_LABEL}"`, '--max', '1'],
      configDir,
    )
    expect(capped.data.issues).to.have.lengthOf(1)
  })

  it('resolves the authenticated user by query', async () => {
    const payload = await runCliJson<{data: Array<{accountId: string}>; success: boolean}>(
      ['jira', 'user', '--query', process.env.ATLASSIAN_EMAIL!],
      configDir,
    )
    expect(payload.success).to.be.true
    expect(payload.data[0].accountId).to.be.a('string')
  })

  it('emits TOON rather than JSON under --toon', async () => {
    const {stdout} = await runCliOk(['jira', 'project', 'list', '--toon'], configDir)
    expect(() => JSON.parse(stdout)).to.throw()
    expect(stdout).to.contain('success: true')
    expect(stdout).to.contain(E2E_PROJECT)
  })

  it('includes the run id in the seeded summary', async () => {
    const payload = await runCliJson<{data: {fields: {summary: string}}}>(['jira', 'issue', seededKey], configDir)
    expect(payload.data.fields.summary).to.contain(RUN_ID)
  })
})
