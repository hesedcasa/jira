import {type ApiResult} from '@hesed/plugin-lib'

/**
 * jira.js 6.3's ApiError family: the failed response's HTTP status and parsed
 * body. Duck-typed so the helpers keep working for plain Errors (no status)
 * and across duplicate installs of the package.
 */
type HttpErrorLike = {body?: unknown; status?: unknown}

const statusOf = (error: unknown): number | undefined => {
  const status = (error as HttpErrorLike | null)?.status
  return typeof status === 'number' && status >= 200 ? status : undefined
}

/**
 * Runs one jira.js call under the pre-6.3 wire contract.
 *
 * jira.js 6.3 throws AuthError whenever a response reports a credentials
 * refusal in x-seraph-loginreason — even though the HTTP layer answered 2xx:
 * Jira Cloud serves anonymous callers rather than rejecting them, so a list
 * endpoint answers a bad token with 200 and an empty page, the refusal carried
 * only in the header. 6.2 returned that body like any other 200. The body is
 * returned here, so the operation's own success shaping (field mapping and the
 * like) keeps running; every other error is rethrown for the caller's catch.
 */
export const callJira = async <T>(call: () => Promise<T>): Promise<T> => {
  try {
    return await call()
  } catch (error: unknown) {
    const status = statusOf(error)
    if (status !== undefined && status < 300) {
      return (error as HttpErrorLike).body as T
    }

    throw error
  }
}

/**
 * Converts a caught error into the failed ApiResult.
 *
 * The `error` message must carry the HTTP status — the suite's documented
 * assertion target — which jira.js 6.3 omits from its AuthError message (the
 * status lives on the error's `status` property instead). A status the message
 * already carries is not repeated.
 */
export const errorToApiResult = (error: unknown): ApiResult => {
  const message = error instanceof Error ? error.message : String(error)
  const status = statusOf(error)
  return {
    error:
      status === undefined || message.includes(String(status))
        ? message
        : `Request failed with HTTP status ${status}: ${message}`,
    success: false,
  }
}
