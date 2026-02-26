import type {ApiResult, Config} from './agile-api.js'

import {AgileApi} from './agile-api.js'

let agileApi: AgileApi | null

/**
 * Initialize Agile API
 */
async function initAgile(config: Config): Promise<AgileApi> {
  if (agileApi) return agileApi

  try {
    agileApi = new AgileApi(config)
    return agileApi
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to initialize Jira client: ${errorMessage}`)
  }
}

/**
 * Clear clients (for cleanup)
 */
export function clearClients(): void {
  if (agileApi) {
    agileApi.clearClients()
    agileApi = null
  }
}

/**
 * Get all sprints from a board
 */
// eslint-disable-next-line max-params
export async function getAllSprints(
  config: Config,
  boardId: number,
  maxResults = 10,
  startAt?: number,
  state?: string,
): Promise<ApiResult> {
  const agile = await initAgile(config)
  return agile.getAllSprints(boardId, maxResults, startAt, state)
}

/**
 * Get all versions from a board
 */
// eslint-disable-next-line max-params
export async function getAllVersions(
  config: Config,
  boardId: number,
  maxResults = 10,
  startAt?: number,
  released?: string,
): Promise<ApiResult> {
  const agile = await initAgile(config)
  return agile.getAllVersions(boardId, maxResults, startAt, released)
}

/**
 * List all boards
 */
export async function getAllBoards(
  config: Config,
  projectKeyOrId?: string,
  maxResults = 10,
  startAt?: number,
): Promise<ApiResult> {
  const agile = await initAgile(config)
  return agile.getAllBoards(projectKeyOrId, maxResults, startAt)
}

/**
 * Get all issues belong to the sprint from the board
 */
// eslint-disable-next-line max-params
export async function getBoardIssuesForSprint(
  config: Config,
  boardId: number,
  sprintId: number,
  jql?: string,
  maxResults = 10,
  startAt?: number,
  fields?: string[],
): Promise<ApiResult> {
  const agile = await initAgile(config)
  return agile.getBoardIssuesForSprint(boardId, sprintId, jql, maxResults, startAt, fields)
}

/**
 * Get all issues from the board's backlog
 */
// eslint-disable-next-line max-params
export async function getIssuesForBacklog(
  config: Config,
  boardId: number,
  jql?: string,
  maxResults = 10,
  startAt?: number,
  fields?: string[],
): Promise<ApiResult> {
  const agile = await initAgile(config)
  return agile.getIssuesForBacklog(boardId, jql, maxResults, startAt, fields)
}
