import {expect} from 'chai'

import {cleanupRun, deleteIssue, RUN_ID, RUN_LABEL, SHARED_LABEL} from './fixtures.js'
import {createConfigDir, E2E_PROJECT, removeConfigDir, runCli, runCliJson} from './helpers.js'

const LABELS = JSON.stringify([SHARED_LABEL, RUN_LABEL])

type Fetched = {
  data: {fields: {comment?: {comments: Array<{body: string; id: string}>}; description: string}}
  success: boolean
}

describe('e2e: content and ADF round-trip', () => {
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

  async function createIssue(description: string): Promise<string> {
    const payload = await runCliJson<{data: {key: string}}>(
      [
        'jira',
        'issue',
        'create',
        '--fields',
        `project={"key":"${E2E_PROJECT}"}`,
        '--fields',
        'issuetype={"name":"Task"}',
        '--fields',
        `summary=[e2e ${RUN_ID}] content`,
        '--fields',
        `description=${description}`,
        '--fields',
        `labels=${LABELS}`,
      ],
      configDir,
    )
    created.push(payload.data.key)
    return payload.data.key
  }

  it('preserves single newlines in a paragraph as hard breaks', async () => {
    const key = await createIssue('line one\nline two')
    const fetched = await runCliJson<Fetched>(['jira', 'issue', key], configDir)

    // Turndown renders an ADF hardBreak as two trailing spaces before the
    // newline. Collapsing to "line one line two" means the hard-break
    // preprocessing in src/markdown.ts regressed.
    expect(fetched.data.fields.description).to.contain('line one')
    expect(fetched.data.fields.description).to.contain('line two')
    expect(fetched.data.fields.description).to.contain('line one  \nline two')
  })

  it('round-trips headings, lists and code blocks', async () => {
    const description = ['# Heading', '', '- item one', '- item two', '', '```bash', 'ls -a', 'echo hi', '```'].join(
      '\n',
    )
    const key = await createIssue(description)
    const fetched = await runCliJson<Fetched>(['jira', 'issue', key], configDir)
    const body = fetched.data.fields.description

    expect(body).to.contain('Heading')
    expect(body).to.contain('item one')
    expect(body).to.contain('item two')
    // Inside a code block the newline must stay raw — no hard-break padding.
    expect(body).to.contain('ls -a')
    expect(body).to.contain('echo hi')
    expect(body).to.not.contain('ls -a  \n')
  })

  it(String.raw`unescapes a literal \n typed inside one shell argument`, async () => {
    const key = await createIssue(String.raw`alpha\nbravo`)
    const fetched = await runCliJson<Fetched>(['jira', 'issue', key], configDir)

    expect(fetched.data.fields.description).to.not.contain(String.raw`\n`)
    expect(fetched.data.fields.description).to.contain('alpha')
    expect(fetched.data.fields.description).to.contain('bravo')
  })

  it('adds, updates and deletes a comment', async () => {
    const key = await createIssue('comment host')

    const added = await runCliJson<{data: {id: string}; success: boolean}>(
      ['jira', 'issue', 'comment', key, 'first\nsecond'],
      configDir,
    )
    expect(added.success).to.be.true
    const commentId = added.data.id

    const withComment = await runCliJson<Fetched>(['jira', 'issue', key], configDir)
    const comment = withComment.data.fields.comment?.comments.find((c) => c.id === commentId)
    expect(comment, 'comment missing from the issue').to.exist
    expect(comment!.body).to.contain('first  \nsecond')

    const {code: updateCode} = await runCli(
      ['jira', 'issue', 'comment-update', key, commentId, 'edited body'],
      configDir,
    )
    expect(updateCode).to.equal(0)

    const afterUpdate = await runCliJson<Fetched>(['jira', 'issue', key], configDir)
    const edited = afterUpdate.data.fields.comment?.comments.find((c) => c.id === commentId)
    expect(edited!.body).to.contain('edited body')

    const {code: deleteCode} = await runCli(['jira', 'issue', 'comment-delete', key, commentId], configDir)
    expect(deleteCode).to.equal(0)

    const afterDelete = await runCliJson<Fetched>(['jira', 'issue', key], configDir)
    const ids = (afterDelete.data.fields.comment?.comments ?? []).map((c) => c.id)
    expect(ids).to.not.include(commentId)
  })

  it('adds, lists and deletes a worklog', async () => {
    const key = await createIssue('worklog host')
    const started = '2026-09-01T09:00:00.000+0000'

    const added = await runCliJson<{data: {id: string}; success: boolean}>(
      ['jira', 'issue', 'worklog', key, started, '1h', 'e2e worklog'],
      configDir,
    )
    expect(added.success).to.be.true
    const worklogId = added.data.id

    const listed = await runCliJson<{data: {worklogs: Array<{id: string; timeSpent: string}>}}>(
      ['jira', 'issue', 'worklogs', key],
      configDir,
    )
    const entry = listed.data.worklogs.find((w) => w.id === worklogId)
    expect(entry, 'worklog missing').to.exist
    expect(entry!.timeSpent).to.equal('1h')

    const {code} = await runCli(['jira', 'issue', 'worklog-delete', key, worklogId], configDir)
    expect(code).to.equal(0)

    const afterDelete = await runCliJson<{data: {worklogs: Array<{id: string}>}}>(
      ['jira', 'issue', 'worklogs', key],
      configDir,
    )
    expect(afterDelete.data.worklogs.map((w) => w.id)).to.not.include(worklogId)
  })
})
