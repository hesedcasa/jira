import {expect} from 'chai'

import {createConfigDir, removeConfigDir, runCli} from './helpers.js'

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
})
