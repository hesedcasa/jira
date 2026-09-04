import {expect} from 'chai'

import {createConfigDir, redactSecret, removeConfigDir, requireEnv, runCli} from './helpers.js'

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
})
