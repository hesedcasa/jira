import {expect} from 'chai'

import {
  createConfigDir,
  E2E_BOARD_ID,
  E2E_PROJECT,
  redactSecret,
  removeConfigDir,
  requireEnv,
  runCli,
  runCliJson,
} from './helpers.js'

type Failure = {error: string; success: false}

describe('e2e: connection', () => {
  let configDir: string

  before(async () => {
    configDir = await createConfigDir()
  })

  after(async () => {
    await removeConfigDir(configDir)
  })

  it('authenticates with the default profile', async () => {
    const {code} = await runCli(['jira', 'auth', 'test'], configDir)
    expect(code).to.equal(0)
  })

  it('redacts the API token from captured output', () => {
    const {apiToken} = requireEnv()
    const text = `some output embedding ${apiToken} in the middle of it`

    expect(redactSecret(text, apiToken)).to.not.include(apiToken)
  })

  it('leaves text untouched when there is no secret to redact', () => {
    const text = 'plain output with no secret in it'

    expect(redactSecret(text, undefined)).to.equal(text)
    expect(redactSecret(text, '')).to.equal(text)
  })

  it('fails auth test on a bad API token', async () => {
    const {code} = await runCli(['jira', 'auth', 'test', '--profile', 'broken'], configDir)
    expect(code).to.equal(2)
  })

  it('errors on an unknown profile rather than falling back to the default', async () => {
    const {code, stdout} = await runCli(['jira', 'project', 'list', '--profile', 'nosuch'], configDir)
    expect(code).to.equal(1)
    expect(JSON.parse(stdout)).to.deep.equal({error: 'Missing authentication config.'})
  })

  // The Agile API rejects an unauthenticated caller outright, so this is the
  // reliable guard for the `66386d6` contract: success:false must set exit 1.
  it('exits non-zero with success:false when the Agile API rejects the token', async () => {
    const {code, stdout} = await runCli(['jira', 'board', '--profile', 'broken'], configDir)
    expect(code).to.equal(1)

    const payload = JSON.parse(stdout) as Failure
    expect(payload.success).to.be.false
    expect(payload.error).to.contain('401')
  })

  it('exits non-zero with success:false when a single resource is not visible to the token', async () => {
    const {code, stdout} = await runCli(['jira', 'project', E2E_PROJECT, '--profile', 'broken'], configDir)
    expect(code).to.equal(1)

    const payload = JSON.parse(stdout) as Failure
    expect(payload.success).to.be.false
    expect(payload.error).to.contain('404')
  })

  // Pinned as observed, not as desired. Jira answers an anonymous caller with
  // an empty list rather than a 401, so the CLI reports success. Changing that
  // is out of scope; this test makes a future fix a visible, deliberate change.
  it('reports an empty success from list endpoints under a bad token', async () => {
    const payload = await runCliJson<{data: unknown[]; success: boolean}>(
      ['jira', 'project', 'list', '--profile', 'broken'],
      configDir,
    )
    expect(payload.success).to.be.true
    expect(payload.data).to.deep.equal([])
  })

  it('still lists boards for the default profile', async () => {
    const payload = await runCliJson<{data: {values: Array<{id: number}>}}>(['jira', 'board'], configDir)
    expect(payload.data.values.map((board) => board.id)).to.include(E2E_BOARD_ID)
  })
})
