import {expect} from 'chai'

import {cleanupRun, deleteIssue, findByLabel, RUN_LABEL, seedIssue, waitForIndexed} from './fixtures.js'

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

  it('tolerates deleting an issue twice', async () => {
    const key = await seedIssue()
    await deleteIssue(key)
    await deleteIssue(key)
  })

  after(async () => {
    await cleanupRun()
  })
})
