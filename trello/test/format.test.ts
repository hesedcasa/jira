import {expect} from 'chai'

import {formatAsToon} from '../src/format.js'

describe('formatAsToon', () => {
  it('formats data as TOON', () => {
    const data = {key: 'value', number: 42}
    const result = formatAsToon(data)
    expect(result).to.be.a('string')
    expect(result.length).to.be.greaterThan(0)
  })

  it('returns empty string for falsy data', () => {
    expect(formatAsToon(null)).to.equal('')
    // eslint-disable-next-line unicorn/no-useless-undefined
    expect(formatAsToon(undefined)).to.equal('')
    expect(formatAsToon('')).to.equal('')
  })
})
