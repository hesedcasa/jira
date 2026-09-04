import {expect} from 'chai'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {cleanupRun, deleteIssue, RUN_ID, RUN_LABEL, SHARED_LABEL} from './fixtures.js'
import {createConfigDir, E2E_PROJECT, removeConfigDir, runCli, runCliJson} from './helpers.js'

const LABELS = JSON.stringify([SHARED_LABEL, RUN_LABEL])
const FILE_BODY = 'e2e attachment fixture\nsecond line\n'

describe('e2e: attachments and dev info', () => {
  let configDir: string
  let workDir: string
  let issueId: string
  let issueKey: string

  before(async () => {
    configDir = await createConfigDir()
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jira-e2e-files-'))

    const payload = await runCliJson<{data: {id: string; key: string}}>(
      [
        'jira',
        'issue',
        'create',
        '--fields',
        `project={"key":"${E2E_PROJECT}"}`,
        '--fields',
        'issuetype={"name":"Task"}',
        '--fields',
        `summary=[e2e ${RUN_ID}] attachments`,
        '--fields',
        'description=attachment host',
        '--fields',
        `labels=${LABELS}`,
      ],
      configDir,
    )
    issueId = payload.data.id
    issueKey = payload.data.key
  })

  // allSettled + finally: a failed delete must not skip the backstop sweep, the
  // token-bearing config dir, or the temp file directory.
  after(async () => {
    try {
      if (issueKey) await Promise.allSettled([deleteIssue(issueKey)])
      await cleanupRun()
    } finally {
      await removeConfigDir(configDir)
      await fs.rm(workDir, {force: true, recursive: true})
    }
  })

  it('uploads a file and downloads it back byte-for-byte', async () => {
    const source = path.join(workDir, 'fixture.txt')
    await fs.writeFile(source, FILE_BODY)

    const uploaded = await runCliJson<{data: Array<{id: string}>; success: boolean}>(
      ['jira', 'issue', 'attachment', issueKey, source],
      configDir,
    )
    expect(uploaded.success).to.be.true
    expect(uploaded.data.length).to.equal(1)
    const attachmentId = uploaded.data[0].id

    const target = path.join(workDir, 'downloaded.txt')
    const downloaded = await runCliJson<{success: boolean}>(
      ['jira', 'issue', 'attachment-download', issueKey, attachmentId, target],
      configDir,
    )
    expect(downloaded.success).to.be.true

    expect(await fs.readFile(target, 'utf8')).to.equal(FILE_BODY)
  })

  it('fails cleanly when the file does not exist', async () => {
    const {code, stdout} = await runCli(
      ['jira', 'issue', 'attachment', issueKey, path.join(workDir, 'nope.txt')],
      configDir,
    )
    expect(code).to.equal(1)

    const payload = JSON.parse(stdout) as {error: string; success: boolean}
    expect(payload.success).to.be.false
    expect(payload.error).to.contain('File not found')
  })

  it('returns a well-formed dev-info payload for an issue with no linked work', async () => {
    // The dev-status endpoint (src/jira/jira-api.ts getIssueDevelopment) takes the
    // numeric issue id, not the key — passing the key returns HTTP 400.
    const payload = await runCliJson<{data: unknown; success: boolean}>(['jira', 'issue', 'dev', issueId], configDir)
    expect(payload.success).to.be.true
    expect(payload.data).to.be.an('object')
  })
})
