import {sweepStale} from '../test/e2e/fixtures.js'

const deleted = await sweepStale()
console.log(`Swept ${deleted} stale e2e fixture(s).`)
