import {expect} from 'chai'

import {cleanupRun, deleteIssue, RUN_ID, RUN_LABEL, SHARED_LABEL} from './fixtures.js'
import {createConfigDir, E2E_PROJECT, removeConfigDir, runCli, runCliJson} from './helpers.js'

const LABELS = JSON.stringify([SHARED_LABEL, RUN_LABEL])

type Fetched = {
  data: {
    fields: {
      comment?: {
        comments: Array<{author: {accountId: string}; body: string; created: string; id: string; updated: string}>
      }
      created: string
      description: string
    }
  }
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

    // An ADF hardBreak reads back as a plain newline. Collapsing to
    // "line one line two" means the hard-break preprocessing in
    // src/markdown.ts regressed.
    expect(fetched.data.fields.description).to.equal('line one\nline two')
  })

  it('round-trips headings, lists, code blocks and tables', async () => {
    const description = [
      '# Heading',
      '',
      '- item one',
      '- item two',
      '',
      '```bash',
      'ls -a',
      'echo hi',
      '```',
      '',
      '| Col A | Col B |',
      '| --- | --- |',
      '| cell-a1 | cell-b1 |',
    ].join('\n')
    const key = await createIssue(description)
    const fetched = await runCliJson<Fetched>(['jira', 'issue', key], configDir)
    const body = fetched.data.fields.description

    // The ADF is converted directly, so the markdown comes back as written:
    // fenced code keeps its language and the table stays a pipe table.
    expect(body).to.equal(description)
  })

  it('preserves single newlines in a blockquote as hard breaks', async () => {
    const description = ['> line one', '> line two'].join('\n')
    const key = await createIssue(description)
    const fetched = await runCliJson<Fetched>(['jira', 'issue', key], configDir)
    const body = fetched.data.fields.description

    expect(body).to.equal(description)
  })

  it('preserves a single newline inside a list item as a hard break', async () => {
    const description = ['- item line one', '  item line two'].join('\n')
    const key = await createIssue(description)
    const fetched = await runCliJson<Fetched>(['jira', 'issue', key], configDir)
    const body = fetched.data.fields.description

    // The continuation line is indented to the item's content column.
    expect(body).to.equal(description)
  })

  it(String.raw`unescapes a literal \n typed inside one shell argument`, async () => {
    const key = await createIssue(String.raw`alpha\nbravo`)
    const fetched = await runCliJson<Fetched>(['jira', 'issue', key], configDir)

    expect(fetched.data.fields.description).to.not.contain(String.raw`\n`)
    // Asserting the rendered separator, not just the absence of the literal
    // sequence: a regression that *dropped* the escape rather than converting
    // it would still satisfy a `not.contain` check on its own.
    expect(fetched.data.fields.description).to.equal('alpha\nbravo')
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
    expect(comment!.body).to.equal('first\nsecond')

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

  it('reads a comment back verbatim: code fences, inline code, brackets and ISO timestamps', async () => {
    const key = await createIssue('comment fidelity host')
    const markdown = [
      '[minion:plan] x',
      '',
      '- `code` inline, see [link](https://example.com)',
      '',
      '```ts',
      'const x = 1;',
      '```',
    ].join('\n')

    const added = await runCliJson<{data: {id: string}; success: boolean}>(
      ['jira', 'issue', 'comment', key, markdown],
      configDir,
    )
    expect(added.success).to.be.true

    const fetched = await runCliJson<Fetched>(['jira', 'issue', key], configDir)
    const comment = fetched.data.fields.comment?.comments.find((c) => c.id === added.data.id)
    expect(comment, 'comment missing from the issue').to.exist
    expect(comment!.body).to.equal(markdown)
    expect(comment!.author.accountId).to.be.a('string').and.not.be.empty
    // Raw ISO strings, not the humanised "Today 12:02 AM" of renderedFields.
    for (const timestamp of [comment!.created, comment!.updated, fetched.data.fields.created]) {
      expect(timestamp).to.include('T')
      expect(Number.isNaN(Date.parse(timestamp))).to.be.false
    }
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
