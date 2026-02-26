import type {ApiResult, Config} from './jira-api.js'

import {JiraApi} from './jira-api.js'

let jiraApi: JiraApi | null

/**
 * Initialize Jira API
 */
async function initJira(config: Config): Promise<JiraApi> {
  if (jiraApi) return jiraApi

  try {
    jiraApi = new JiraApi(config)
    return jiraApi
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to initialize Jira client: ${errorMessage}`)
  }
}

/**
 * List all projects
 * @param config - Jira configuration
 */
export async function listProjects(config: Config): Promise<ApiResult> {
  const jira = await initJira(config)
  return jira.listProjects()
}

/**
 * Get project details
 * @param config - Jira configuration
 * @param projectIdOrKey - Project ID or key
 */
export async function getProject(config: Config, projectIdOrKey: string): Promise<ApiResult> {
  const jira = await initJira(config)
  return jira.getProject(projectIdOrKey)
}

/**
 * Search issues using JQL
 * @param config - Jira configuration
 * @param jql - JQL query string
 * @param maxResults - Maximum number of results
 * @param nextPageToken - Token for next page
 * @param fields - Extra list of fields to return
 */
// eslint-disable-next-line max-params
export async function searchIssues(
  config: Config,
  jql: string,
  maxResults = 50,
  nextPageToken?: string,
  fields?: string[],
): Promise<ApiResult> {
  const jira = await initJira(config)
  return jira.searchIssues(jql, maxResults, nextPageToken, fields)
}

/**
 * Get issue details
 * @param config - Jira configuration
 * @param issueIdOrKey - Issue ID or key
 */
export async function getIssue(config: Config, issueIdOrKey: string): Promise<ApiResult> {
  const jira = await initJira(config)
  return jira.getIssue(issueIdOrKey)
}

/**
 * Create a new issue
 * @param config - Jira configuration
 * @param fields - Issue fields
 */
export async function createIssue(config: Config, fields: Record<string, unknown>): Promise<ApiResult> {
  const jira = await initJira(config)
  return jira.createIssue(fields)
}

/**
 * Update an existing issue
 * @param config - Jira configuration
 * @param issueIdOrKey - Issue ID or key
 * @param fields - Issue fields to update
 * @returns ApiResult with success message (note: update operations don't return formatted data, unlike query operations)
 */
export async function updateIssue(
  config: Config,
  issueIdOrKey: string,
  fields: Record<string, unknown>,
): Promise<ApiResult> {
  const jira = await initJira(config)
  return jira.updateIssue(issueIdOrKey, fields)
}

/**
 * Add an attachment to an issue
 * @param config - Jira configuration
 * @param issueIdOrKey - Issue ID or key
 * @param filePath - Path to the file to upload
 */
export async function addAttachment(config: Config, issueIdOrKey: string, filePath: string): Promise<ApiResult> {
  const jira = await initJira(config)
  return jira.addAttachment(issueIdOrKey, filePath)
}

/**
 * Add a comment to an issue
 * @param config - Jira configuration
 * @param issueIdOrKey - Issue ID or key
 * @param body - Comment body
 */
export async function addComment(config: Config, issueIdOrKey: string, body: string): Promise<ApiResult> {
  const jira = await initJira(config)
  return jira.addComment(issueIdOrKey, body)
}

/**
 * Delete a comment from an issue
 * @param config - Jira configuration
 * @param id - Comment ID
 * @param issueIdOrKey - Issue ID or key
 */
export async function deleteComment(config: Config, id: string, issueIdOrKey: string): Promise<ApiResult> {
  const jira = await initJira(config)
  return jira.deleteComment(id, issueIdOrKey)
}

/**
 * Add a comment to an issue
 * @param config - Jira configuration
 * @param id - Comment ID
 * @param issueIdOrKey - Issue ID or key
 * @param body - Comment body
 */
export async function updateComment(
  config: Config,
  id: string,
  issueIdOrKey: string,
  body: string,
): Promise<ApiResult> {
  const jira = await initJira(config)
  return jira.updateComment(id, issueIdOrKey, body)
}

/**
 * Delete an issue
 * @param config - Jira configuration
 * @param issueIdOrKey - Issue ID or key
 * @returns ApiResult with success message (note: delete operations don't return formatted data, unlike query operations)
 */
export async function deleteIssue(config: Config, issueIdOrKey: string): Promise<ApiResult> {
  const jira = await initJira(config)
  return jira.deleteIssue(issueIdOrKey)
}

/**
 * Assigns an issue to a user
 * @param config - Jira configuration
 * @param assignIssue - Account ID of the user
 * @param issueIdOrKey - Issue ID or key
 */
export async function assignIssue(config: Config, assignIssue: string, issueIdOrKey: string): Promise<ApiResult> {
  const jira = await initJira(config)
  return jira.assignIssue(assignIssue, issueIdOrKey)
}

/**
 * List users that can be assigned to an issue
 * @param config - Jira configuration
 * @param issueIdOrKey - Issue ID or key
 * @param query - Query string that matches user attributes
 */
export async function findAssignableUsers(config: Config, issueIdOrKey: string, query?: string): Promise<ApiResult> {
  const jira = await initJira(config)
  return jira.findAssignableUsers(issueIdOrKey, query)
}

/**
 * Get user information
 * @param config - Jira configuration
 * @param accountId - User account ID
 * @param query - Query string that matches user attributes
 */
export async function getUser(config: Config, accountId?: string, query?: string): Promise<ApiResult> {
  const jira = await initJira(config)
  return jira.getUser(accountId, query)
}

/**
 * Test Jira API connection
 * @param config - Jira configuration
 */
export async function testConnection(config: Config): Promise<ApiResult> {
  const jira = await initJira(config)
  return jira.testConnection()
}

/**
 * Assigns an issue to a user
 * @param config - Jira configuration
 * @param issueIdOrKey - Issue ID or key
 * @param transitionId - Issue transition ID
 */
export async function doTransition(config: Config, issueIdOrKey: string, transitionId: string): Promise<ApiResult> {
  const jira = await initJira(config)
  return jira.doTransition(issueIdOrKey, transitionId)
}

/**
 * Clear clients (for cleanup)
 */
export function clearClients(): void {
  if (jiraApi) {
    jiraApi.clearClients()
    jiraApi = null
  }
}

/**
 * Download attachment from an issue
 * @param config - Jira configuration
 * @param issueIdOrKey - Issue ID or key
 * @param attachmentId - Attachment ID
 * @param outputPath - Output file path (optional)
 */
export async function downloadAttachment(
  config: Config,
  issueIdOrKey: string,
  attachmentId: string,
  outputPath?: string,
): Promise<ApiResult> {
  const jira = await initJira(config)
  return jira.downloadAttachment(issueIdOrKey, attachmentId, outputPath)
}

/**
 * Get transitions that can be performed by the user on an issue
 * @param config - Jira configuration
 * @param issueIdOrKey - Issue ID or key
 */
export async function getTransitions(config: Config, issueIdOrKey: string): Promise<ApiResult> {
  const jira = await initJira(config)
  return jira.getTransitions(issueIdOrKey)
}

/**
 * Add a worklog to an issue
 * @param config - Jira configuration
 * @param issueIdOrKey - Issue ID or key
 * @param started - Datetime the worklog effort started
 * @param timeSpent - Time spent working on the issue
 * @param comment - Comment body
 */
// eslint-disable-next-line max-params
export async function worklog(
  config: Config,
  issueIdOrKey: string,
  started: string,
  timeSpent: string,
  comment?: string,
): Promise<ApiResult> {
  const jira = await initJira(config)
  return jira.worklog(issueIdOrKey, started, timeSpent, comment)
}

/**
 * Get worklogs for an issue (ordered by created time)
 * @param config - Jira configuration
 * @param issueIdOrKey - Issue ID or key
 * @param maxResults - Maximum number of items per page
 * @param startAt - Index of the first item to return
 */
export async function getIssueWorklog(
  config: Config,
  issueIdOrKey: string,
  maxResults = 10,
  startAt?: number,
): Promise<ApiResult> {
  const jira = await initJira(config)
  return jira.getIssueWorklog(issueIdOrKey, maxResults, startAt)
}

/**
 * Delete a worklog from an issue
 * @param config - Jira configuration
 * @param id - Worklog ID
 * @param issueIdOrKey - Issue ID or key
 */
export async function deleteWorklog(config: Config, id: string, issueIdOrKey: string): Promise<ApiResult> {
  const jira = await initJira(config)
  return jira.deleteWorklog(id, issueIdOrKey)
}
