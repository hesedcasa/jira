import {type ApiResult, type AuthConfig, createApiClient} from '@hesed/plugin-lib'

import {JiraApi} from './jira-api.js'

const {clearClients, getClient} = createApiClient('Jira', (config: AuthConfig) => new JiraApi(config))

export {clearClients}

export async function listProjects(config: AuthConfig): Promise<ApiResult> {
  const jira = await getClient(config)
  return jira.listProjects()
}

export async function getProject(config: AuthConfig, projectIdOrKey: string): Promise<ApiResult> {
  const jira = await getClient(config)
  return jira.getProject(projectIdOrKey)
}

// eslint-disable-next-line max-params
export async function searchIssues(
  config: AuthConfig,
  jql: string,
  maxResults = 50,
  nextPageToken?: string,
  fields?: string[],
): Promise<ApiResult> {
  const jira = await getClient(config)
  return jira.searchIssues(jql, maxResults, nextPageToken, fields)
}

export async function getIssue(config: AuthConfig, issueIdOrKey: string): Promise<ApiResult> {
  const jira = await getClient(config)
  return jira.getIssue(issueIdOrKey)
}

export async function createIssue(config: AuthConfig, fields: Record<string, unknown>): Promise<ApiResult> {
  const jira = await getClient(config)
  return jira.createIssue(fields)
}

export async function updateIssue(
  config: AuthConfig,
  issueIdOrKey: string,
  fields: Record<string, unknown>,
): Promise<ApiResult> {
  const jira = await getClient(config)
  return jira.updateIssue(issueIdOrKey, fields)
}

export async function addAttachment(config: AuthConfig, issueIdOrKey: string, filePath: string): Promise<ApiResult> {
  const jira = await getClient(config)
  return jira.addAttachment(issueIdOrKey, filePath)
}

export async function addComment(
  config: AuthConfig,
  issueIdOrKey: string,
  body: string,
  parentId?: string,
): Promise<ApiResult> {
  const jira = await getClient(config)
  return jira.addComment(issueIdOrKey, body, parentId)
}

// eslint-disable-next-line max-params
export async function addCommentWithMedia(
  config: AuthConfig,
  issueIdOrKey: string,
  body: string,
  filePaths: string[],
  parentId?: string,
): Promise<ApiResult> {
  const jira = await getClient(config)
  return jira.addCommentWithMedia(issueIdOrKey, body, filePaths, parentId)
}

export async function deleteComment(config: AuthConfig, id: string, issueIdOrKey: string): Promise<ApiResult> {
  const jira = await getClient(config)
  return jira.deleteComment(id, issueIdOrKey)
}

export async function updateComment(
  config: AuthConfig,
  id: string,
  issueIdOrKey: string,
  body: string,
): Promise<ApiResult> {
  const jira = await getClient(config)
  return jira.updateComment(id, issueIdOrKey, body)
}

export async function deleteIssue(config: AuthConfig, issueIdOrKey: string): Promise<ApiResult> {
  const jira = await getClient(config)
  return jira.deleteIssue(issueIdOrKey)
}

export async function assignIssue(config: AuthConfig, accountId: string, issueIdOrKey: string): Promise<ApiResult> {
  const jira = await getClient(config)
  return jira.assignIssue(accountId, issueIdOrKey)
}

export async function findAssignableUsers(
  config: AuthConfig,
  issueIdOrKey: string,
  query?: string,
): Promise<ApiResult> {
  const jira = await getClient(config)
  return jira.findAssignableUsers(issueIdOrKey, query)
}

export async function getUser(config: AuthConfig, accountId?: string, query?: string): Promise<ApiResult> {
  const jira = await getClient(config)
  return jira.getUser(accountId, query)
}

export async function testConnection(config: AuthConfig): Promise<ApiResult> {
  const jira = await getClient(config)
  return jira.testConnection()
}

export async function doTransition(config: AuthConfig, issueIdOrKey: string, transitionId: string): Promise<ApiResult> {
  const jira = await getClient(config)
  return jira.doTransition(issueIdOrKey, transitionId)
}

export async function getIssueDevelopment(
  config: AuthConfig,
  issueId: string,
  applicationType: string,
  dataType: string,
): Promise<ApiResult> {
  const jira = await getClient(config)
  return jira.getIssueDevelopment(issueId, applicationType, dataType)
}

export async function downloadAttachment(
  config: AuthConfig,
  issueIdOrKey: string,
  attachmentId: string,
  outputPath?: string,
): Promise<ApiResult> {
  const jira = await getClient(config)
  return jira.downloadAttachment(issueIdOrKey, attachmentId, outputPath)
}

export async function getTransitions(config: AuthConfig, issueIdOrKey: string): Promise<ApiResult> {
  const jira = await getClient(config)
  return jira.getTransitions(issueIdOrKey)
}

// eslint-disable-next-line max-params
export async function worklog(
  config: AuthConfig,
  issueIdOrKey: string,
  started: string,
  timeSpent: string,
  comment?: string,
): Promise<ApiResult> {
  const jira = await getClient(config)
  return jira.worklog(issueIdOrKey, started, timeSpent, comment)
}

export async function getIssueWorklog(
  config: AuthConfig,
  issueIdOrKey: string,
  maxResults = 10,
  startAt?: number,
): Promise<ApiResult> {
  const jira = await getClient(config)
  return jira.getIssueWorklog(issueIdOrKey, maxResults, startAt)
}

export async function deleteWorklog(config: AuthConfig, id: string, issueIdOrKey: string): Promise<ApiResult> {
  const jira = await getClient(config)
  return jira.deleteWorklog(id, issueIdOrKey)
}
