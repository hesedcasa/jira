import {type ApiResult, type AuthConfig, createApiClient} from '@hesed/plugin-lib'

import {AgileApi} from './agile-api.js'

const {clearClients, getClient} = createApiClient('Jira Agile', (config: AuthConfig) => new AgileApi(config))

export {clearClients}

// eslint-disable-next-line max-params
export async function getAllSprints(
  config: AuthConfig,
  boardId: number,
  maxResults = 10,
  startAt?: number,
  state?: string,
): Promise<ApiResult> {
  const agile = await getClient(config)
  return agile.getAllSprints(boardId, maxResults, startAt, state)
}

// eslint-disable-next-line max-params
export async function getAllVersions(
  config: AuthConfig,
  boardId: number,
  maxResults = 10,
  startAt?: number,
  released?: string,
): Promise<ApiResult> {
  const agile = await getClient(config)
  return agile.getAllVersions(boardId, maxResults, startAt, released)
}

export async function getAllBoards(
  config: AuthConfig,
  projectKeyOrId?: string,
  maxResults = 10,
  startAt?: number,
): Promise<ApiResult> {
  const agile = await getClient(config)
  return agile.getAllBoards(projectKeyOrId, maxResults, startAt)
}

// eslint-disable-next-line max-params
export async function getBoardIssuesForSprint(
  config: AuthConfig,
  boardId: number,
  sprintId: number,
  jql?: string,
  maxResults = 10,
  startAt?: number,
  fields?: string[],
): Promise<ApiResult> {
  const agile = await getClient(config)
  return agile.getBoardIssuesForSprint(boardId, sprintId, jql, maxResults, startAt, fields)
}

// eslint-disable-next-line max-params
export async function getIssuesForBacklog(
  config: AuthConfig,
  boardId: number,
  jql?: string,
  maxResults = 10,
  startAt?: number,
  fields?: string[],
): Promise<ApiResult> {
  const agile = await getClient(config)
  return agile.getIssuesForBacklog(boardId, jql, maxResults, startAt, fields)
}
