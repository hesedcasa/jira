/* eslint-disable @typescript-eslint/no-explicit-any */
import {expect} from 'chai'
import esmock from 'esmock'

describe('config', () => {
  let readConfig: any

  it('reads config from file', async () => {
    const mockConfig = {
      auth: {
        apiKey: 'test-key',
        apiToken: 'test-token',
      },
    }

    const configModule = await esmock('../src/config.js', {
      'fs-extra': {
        default: {
          readJSON: async () => mockConfig,
        },
      },
    })
    readConfig = configModule.readConfig

    const result = await readConfig('/tmp/test', () => {})
    expect(result).to.deep.equal(mockConfig)
  })

  it('returns undefined when file is missing', async () => {
    const configModule = await esmock('../src/config.js', {
      'fs-extra': {
        default: {
          async readJSON() {
            throw new Error('ENOENT: no such file or directory')
          },
        },
      },
    })
    readConfig = configModule.readConfig

    const logMessages: string[] = []
    const result = await readConfig('/tmp/test', (msg: string) => logMessages.push(msg))

    expect(result).to.be.undefined
    expect(logMessages[0]).to.equal('Missing authentication config')
  })

  it('logs error message for other errors', async () => {
    const configModule = await esmock('../src/config.js', {
      'fs-extra': {
        default: {
          async readJSON() {
            throw new Error('Permission denied')
          },
        },
      },
    })
    readConfig = configModule.readConfig

    const logMessages: string[] = []
    const result = await readConfig('/tmp/test', (msg: string) => logMessages.push(msg))

    expect(result).to.be.undefined
    expect(logMessages[0]).to.equal('Permission denied')
  })
})
