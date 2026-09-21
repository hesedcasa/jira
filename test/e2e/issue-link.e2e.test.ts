import {expect} from 'chai'

import {cleanupRun, getIssueLinks, RUN_ID, seedIssue} from './fixtures.js'
import {createConfigDir, removeConfigDir, runCli} from './helpers.js'

describe('e2e: issue links', () => {
  let configDir: string

  before(async () => {
    configDir = await createConfigDir()
  })

  // allSettled + finally: a single failed delete must not skip the label-based
  // backstop sweep, nor leave the token-bearing config dir on disk.
  after(async () => {
    try {
      await cleanupRun()
    } finally {
      await removeConfigDir(configDir)
    }
  })

  it('links two issues with a directional link type', async () => {
    const blocker = await seedIssue({summary: `[e2e ${RUN_ID}] link blocker`})
    const blocked = await seedIssue({summary: `[e2e ${RUN_ID}] link blocked`})

    const {code} = await runCli(['jira', 'issue', 'link', blocker, blocked, '--type', 'Blocks'], configDir)
    expect(code).to.equal(0)

    // Direction: the first issue blocks the second, so the blocker holds the
    // outward end. In an issue's issuelinks array the inwardIssue/outwardIssue
    // key names the OTHER end of the link, so the blocker's entry lists the
    // blocked issue under inwardIssue and vice versa.
    const onBlocker = await getIssueLinks(blocker)
    expect(
      onBlocker.some((link) => link.type.name === 'Blocks' && link.inwardIssue?.key === blocked),
      `expected ${blocker} to link outward to ${blocked}`,
    ).to.be.true

    const onBlocked = await getIssueLinks(blocked)
    expect(
      onBlocked.some((link) => link.type.name === 'Blocks' && link.outwardIssue?.key === blocker),
      `expected ${blocked} to link inward to ${blocker}`,
    ).to.be.true
  })

  it('accepts a comment with the link', async () => {
    const blocker = await seedIssue({summary: `[e2e ${RUN_ID}] link comment blocker`})
    const blocked = await seedIssue({summary: `[e2e ${RUN_ID}] link comment blocked`})

    const {code} = await runCli(
      [
        'jira',
        'issue',
        'link',
        blocker,
        blocked,
        '--type',
        'Blocks',
        '--comment',
        'Blocked until the schema migration lands',
      ],
      configDir,
    )
    expect(code).to.equal(0)

    // The live API accepted the Markdown-converted ADF comment; the wire
    // format itself is pinned by the unit tests.
    const onBlocker = await getIssueLinks(blocker)
    expect(
      onBlocker.some((link) => link.type.name === 'Blocks' && link.inwardIssue?.key === blocked),
      `expected ${blocker} to link outward to ${blocked}`,
    ).to.be.true
  })

  it('fails on an unknown link type', async () => {
    const blocker = await seedIssue({summary: `[e2e ${RUN_ID}] link bad type blocker`})
    const blocked = await seedIssue({summary: `[e2e ${RUN_ID}] link bad type blocked`})

    const {code, stdout} = await runCli(['jira', 'issue', 'link', blocker, blocked, '--type', 'Bogus'], configDir)
    expect(code).to.equal(1)

    const payload = JSON.parse(stdout) as {error: string; success: boolean}
    expect(payload.success).to.be.false
    // An unknown link type is a 404 ("No issue link type with name … found").
    expect(payload.error).to.contain('404')
  })
})
