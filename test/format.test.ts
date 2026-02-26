import {expect} from 'chai'

import {formatAsToon} from '../src/format.js'

describe('format', () => {
  describe('formatAsToon', () => {
    it('formats an object as TOON string', () => {
      const data = {name: 'test', value: 123}
      const result = formatAsToon(data)
      expect(result).to.be.a('string')
      expect(result).to.include('test')
      expect(result).to.include('123')
    })

    it('returns empty string for null data', () => {
      const result = formatAsToon(null)
      expect(result).to.equal('')
    })

    it('returns empty string for undefined data', () => {
      // eslint-disable-next-line unicorn/no-useless-undefined
      const result = formatAsToon(undefined)
      expect(result).to.equal('')
    })

    it('formats arrays as TOON string', () => {
      const data = [1, 2, 3]
      const result = formatAsToon(data)
      expect(result).to.be.a('string')
      expect(result).to.include('1')
      expect(result).to.include('2')
      expect(result).to.include('3')
    })

    it('formats nested objects as TOON string', () => {
      const data = {user: {age: 30, name: 'John'}}
      const result = formatAsToon(data)
      expect(result).to.be.a('string')
      expect(result).to.include('John')
      expect(result).to.include('30')
    })
  })
})
