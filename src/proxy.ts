import {getProxyForUrl} from 'proxy-from-env'
import {EnvHttpProxyAgent, setGlobalDispatcher} from 'undici'

/**
 * jira.js 6 dropped axios for `fetch`, and with it `baseRequestConfig` — there is no
 * per-client agent to hand a proxy to any more. Node's `fetch` also ignores the
 * HTTP(S)_PROXY environment variables outright; what it does honour is undici's global
 * dispatcher, so route through an `EnvHttpProxyAgent`.
 *
 * The agent reads the same variables per request and honours NO_PROXY, and it opens an
 * HTTP CONNECT tunnel for https:// targets — which is what MITM-style proxies that
 * require CONNECT (e.g. Agent Vault) rejected axios's absolute-URI requests for.
 *
 * Unlike the axios workaround this covers http:// targets too, and it applies to the
 * plain `fetch` calls this CLI makes alongside jira.js (attachment downloads, the
 * dev-status endpoint), which previously bypassed the proxy entirely.
 */
export function configureFetchProxy(host: string): void {
  // Nothing to install when this host has no proxy configured, or NO_PROXY excludes it.
  if (!getProxyForUrl(host)) return

  setGlobalDispatcher(new EnvHttpProxyAgent())
}
