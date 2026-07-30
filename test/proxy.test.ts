import {expect} from 'chai'

import {buildProxyRequestConfig} from '../src/proxy.js'

describe('buildProxyRequestConfig', () => {
  const originalEnv = {...process.env}

  // proxy-from-env consults each of these (preferring the lowercase form), so any
  // left set by the surrounding environment would leak into the assertions below.
  const proxyEnvKeys = [
    'ALL_PROXY',
    'HTTPS_PROXY',
    'HTTP_PROXY',
    'NO_PROXY',
    'npm_config_no_proxy',
    'npm_config_proxy',
    'npm_config_http_proxy',
    'npm_config_https_proxy',
  ]

  beforeEach(() => {
    for (const key of proxyEnvKeys) {
      delete process.env[key]
      delete process.env[key.toLowerCase()]
    }
  })

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) delete process.env[key]
    }

    Object.assign(process.env, originalEnv)
  })

  it('returns undefined when no proxy env var is set', () => {
    expect(buildProxyRequestConfig('https://test.atlassian.net')).to.equal(undefined)
  })

  it('returns an httpsAgent and disables axios proxy handling when HTTPS_PROXY is set', () => {
    process.env.HTTPS_PROXY = 'http://user:pass@proxy.example.com:8080'

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

  it('returns undefined for an http:// host so axios keeps its own proxy handling', () => {
    process.env.HTTP_PROXY = 'http://proxy.example.com:8080'

    expect(buildProxyRequestConfig('http://jira.internal.example.com')).to.equal(undefined)
  })

  it('returns undefined for a host without a parseable URL', () => {
    process.env.HTTPS_PROXY = 'http://proxy.example.com:8080'

    expect(buildProxyRequestConfig('test.atlassian.net')).to.equal(undefined)
  })
})
