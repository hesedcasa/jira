import {expect} from 'chai'

import {buildProxyRequestConfig} from '../src/proxy.js'

describe('buildProxyRequestConfig', () => {
  const originalEnv = {...process.env}

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) delete process.env[key]
    }

    Object.assign(process.env, originalEnv)
  })

  it('returns undefined when no proxy env var is set', () => {
    delete process.env.HTTPS_PROXY
    delete process.env.https_proxy
    delete process.env.NO_PROXY

    expect(buildProxyRequestConfig('https://test.atlassian.net')).to.equal(undefined)
  })

  it('returns an httpsAgent and disables axios proxy handling when HTTPS_PROXY is set', () => {
    process.env.HTTPS_PROXY = 'http://user:pass@proxy.example.com:8080'
    delete process.env.NO_PROXY

    const config = buildProxyRequestConfig('https://test.atlassian.net')

    expect(config).to.not.equal(undefined)
    expect(config?.proxy).to.equal(false)
    expect(config?.httpsAgent).to.be.an('object')
  })

  it('returns undefined when the host is excluded via NO_PROXY', () => {
    process.env.HTTPS_PROXY = 'http://proxy.example.com:8080'
    process.env.NO_PROXY = 'test.atlassian.net'

    expect(buildProxyRequestConfig('https://test.atlassian.net')).to.equal(undefined)
  })
})
