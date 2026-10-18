import {type ApiResult, type AuthConfig} from '@hesed/plugin-lib'
import {type AgileClient, createAgileClient} from 'jira.js'
import {createClient} from 'jira.js/core'

import {callJira, errorToApiResult} from '../api-result.js'
import {configureFetchProxy} from '../proxy.js'
import {defaultFields, processIssueRenderedAndFields} from '../utils.js'

/**
 * Agile API Utility Module
 * Provides core Agile API operations with formatting
 */
export class AgileApi {
  private client?: AgileClient
  private readonly config: AuthConfig

  constructor(config: AuthConfig) {
    this.config = config
  }

  /**
   * Clear client (for cleanup)
   */
  clearClients(): void {
    this.client = undefined
  }

  /**
   * List all boards
   */
  async getAllBoards(projectKeyOrId?: string, maxResults = 10, startAt?: number): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const boards = await callJira(async () =>
        client.board.getAllBoards({
          maxResults,
          projectKeyOrId,
          startAt,
        }),
      )

      return {
        data: boards,
        success: true,
      }
    } catch (error: unknown) {
      return errorToApiResult(error)
    }
  }

  /**
   * Get all sprints from a board
   */
  async getAllSprints(boardId: number, maxResults = 10, startAt?: number, state?: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const boards = await callJira(async () =>
        client.board.getAllSprints({
          boardId,
          maxResults,
          startAt,
          state,
        }),
      )

      return {
        data: boards,
        success: true,
      }
    } catch (error: unknown) {
      return errorToApiResult(error)
    }
  }

  /**
   * Get all versions from a board
   */
  async getAllVersions(boardId: number, maxResults = 10, startAt?: number, released?: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const versions = await callJira(async () =>
        client.board.getAllVersions({
          boardId,
          maxResults,
          released,
          startAt,
        }),
      )

      return {
        data: versions,
        success: true,
      }
    } catch (error: unknown) {
      return errorToApiResult(error)
    }
  }

  /**
   * Get all issues belong to the sprint from the board
   */
  // eslint-disable-next-line max-params
  async getBoardIssuesForSprint(
    boardId: number,
    sprintId: number,
    jql?: string,
    maxResults = 10,
    nextPageToken?: string,
    fields?: string[],
  ): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const finalFields = [...new Set<string>([...(fields ?? []), ...defaultFields])]
      const result = await callJira(async () =>
        client.board.getBoardIssuesForSprint({
          boardId,
          fields: finalFields,
          jql,
          maxResults,
          nextPageToken,
          sprintId,
        }),
      )

      if (result.issues) {
        for (const issue of result.issues) {
          try {
            processIssueRenderedAndFields(issue)
          } catch {
            // Ignore processing errors for individual issues
          }
        }
      }

      return {
        data: {issues: result.issues, nextPageToken: result.nextPageToken},
        success: true,
      }
    } catch (error: unknown) {
      return errorToApiResult(error)
    }
  }

  /**
   * Get or create Agile client
   */
  getClient(): AgileClient {
    if (this.client) {
      return this.client
    }

    configureFetchProxy(this.config.host!)

    this.client = createAgileClient(
      createClient({
        auth: this.config.email
          ? {apiToken: this.config.apiToken, email: this.config.email, type: 'basic'}
          : {token: this.config.apiToken, type: 'bearer'},
        host: this.config.host!,
      }),
    )

    return this.client
  }

  /**
   * Get all issues from the board's backlog
   */
  // eslint-disable-next-line max-params
  async getIssuesForBacklog(
    boardId: number,
    jql?: string,
    maxResults = 10,
    nextPageToken?: string,
    fields?: string[],
  ): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const finalFields = [...new Set<string>([...(fields ?? []), ...defaultFields])]
      const result = await callJira(async () =>
        client.board.getIssuesForBacklog({
          boardId,
          fields: finalFields,
          jql,
          maxResults,
          nextPageToken,
        }),
      )

      if (result.issues) {
        for (const issue of result.issues) {
          try {
            processIssueRenderedAndFields(issue)
          } catch {
            // Ignore processing errors for individual issues
          }
        }
      }

      return {
        data: {issues: result.issues, nextPageToken: result.nextPageToken},
        success: true,
      }
    } catch (error: unknown) {
      return errorToApiResult(error)
    }
  }
}
