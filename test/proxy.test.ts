import {expect} from 'chai'
import {Agent, type Dispatcher, EnvHttpProxyAgent, getGlobalDispatcher, setGlobalDispatcher} from 'undici'

import {configureFetchProxy} from '../src/proxy.js'

describe('configureFetchProxy', () => {
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

  let originalDispatcher: Dispatcher
  let baseline: Dispatcher

  beforeEach(() => {
    originalDispatcher = getGlobalDispatcher()

    // Start from a dispatcher that is definitively not a proxy one. Mocha runs every file in
    // one process, so without this the assertions could pass on state another test — or the
    // ambient environment — left installed rather than on what this call did.
    baseline = new Agent()
    setGlobalDispatcher(baseline)

    for (const key of proxyEnvKeys) {
      delete process.env[key]
      delete process.env[key.toLowerCase()]
    }
  })

  afterEach(() => {
    // Installing a dispatcher is global, so put the original one back.
    setGlobalDispatcher(originalDispatcher)

    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) delete process.env[key]
    }

    Object.assign(process.env, originalEnv)
  })

  it('leaves the global dispatcher alone when no proxy env var is set', () => {
    configureFetchProxy('https://test.atlassian.net')

    expect(getGlobalDispatcher()).to.equal(baseline)
  })

  it('installs a proxy dispatcher when HTTPS_PROXY is set', () => {
    process.env.HTTPS_PROXY = 'http://user:pass@proxy.example.com:8080'

    configureFetchProxy('https://test.atlassian.net')

    expect(getGlobalDispatcher()).to.be.an.instanceOf(EnvHttpProxyAgent)
  })

  it('installs a proxy dispatcher for an http:// host too', () => {
    process.env.HTTP_PROXY = 'http://proxy.example.com:8080'

    configureFetchProxy('http://jira.internal.example.com')

    expect(getGlobalDispatcher()).to.be.an.instanceOf(EnvHttpProxyAgent)
  })

  it('leaves the global dispatcher alone when the host is excluded via NO_PROXY', () => {
    process.env.HTTPS_PROXY = 'http://proxy.example.com:8080'
    process.env.NO_PROXY = 'test.atlassian.net'

    configureFetchProxy('https://test.atlassian.net')

    expect(getGlobalDispatcher()).to.equal(baseline)
  })

  it('leaves the global dispatcher alone for a host without a parseable URL', () => {
    process.env.HTTPS_PROXY = 'http://proxy.example.com:8080'

    configureFetchProxy('test.atlassian.net')

    expect(getGlobalDispatcher()).to.equal(baseline)
  })
})
