import {HttpsProxyAgent} from 'https-proxy-agent'
import {getProxyForUrl} from 'proxy-from-env'

/**
 * axios (jira.js's HTTP client) resolves HTTP(S)_PROXY env vars itself, but for
 * https:// targets it forwards a plain absolute-URI request instead of opening an
 * HTTP CONNECT tunnel — unlike fetch/undici. MITM-style proxies that require CONNECT
 * for https:// upstreams (e.g. Agent Vault) reject that with a 400. Building an
 * explicit httpsAgent that tunnels correctly, and disabling axios's own proxy
 * handling for the request, works around it.
 *
 * The workaround only applies to https:// targets. For http:// targets axios already
 * does the right thing (an absolute-URI request to the proxy), and it would consult
 * `httpAgent` rather than `httpsAgent` — so returning `proxy: false` there would
 * silently bypass the proxy instead of routing through it.
 */
export function buildProxyRequestConfig(host: string): undefined | {httpsAgent: HttpsProxyAgent<string>; proxy: false} {
  if (!isHttpsTarget(host)) return undefined

  const proxyUrl = getProxyForUrl(host)
  if (!proxyUrl) return undefined

  return {
    httpsAgent: new HttpsProxyAgent(proxyUrl),
    proxy: false,
  }
}

function isHttpsTarget(host: string): boolean {
  try {
    return new URL(host).protocol === 'https:'
  } catch {
    return false
  }
}
