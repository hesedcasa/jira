import {expect} from 'chai'

import {
  cleanupRun,
  deleteIssue,
  findByLabel,
  issueHttpStatus,
  RUN_LABEL,
  seedIssue,
  waitForIndexed,
} from './fixtures.js'

describe('e2e: fixtures', () => {
  it('seeds an issue that is findable by its run label, then cleans up', async () => {
    const key = await seedIssue()
    expect(key.startsWith('SS-'), `unexpected key: ${key}`).to.be.true

    const found = await waitForIndexed(RUN_LABEL, 1)
    expect(found).to.include(key)

    await cleanupRun()

    const afterCleanup = await findByLabel(RUN_LABEL)
    expect(afterCleanup).to.not.include(key)
  })

  it('cleans up a fixture created too recently to be indexed', async () => {
    // No waitForIndexed here: that is the point. cleanupRun runs while the
    // issue is still invisible to JQL, so only the created-key tracking can
    // reclaim it. Asserting through the API rather than a search, since a
    // search would be subject to the same indexing lag.
    const key = await seedIssue()
    await cleanupRun()

    const status = await issueHttpStatus(key)
    expect(status, `${key} should be gone, got HTTP ${status}`).to.equal(404)
  })

  it('tolerates deleting an issue twice', async () => {
    const key = await seedIssue()
    await deleteIssue(key)
    await deleteIssue(key)
  })

  after(async () => {
    await cleanupRun()
  })
})
