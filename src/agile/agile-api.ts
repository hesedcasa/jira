import {type ApiResult, type AuthConfig} from '@hesed/plugin-lib'
import {type AgileClient, createAgileClient} from 'jira.js'
import {createClient} from 'jira.js/core'

import {configureFetchProxy} from '../proxy.js'
import {defaultFields, processIssueRenderedAndFields} from '../utils.js'

/**
 * The `fields` query parameter of the board issue endpoints. The generator types it as
 * an array of objects, which is an artefact of Atlassian's specification — the endpoints
 * take a list of field names, and the value is serialised straight into the query string
 * as repeated `fields=` entries. The cast below is to the declared type, not around a
 * real mismatch.
 */
type FieldsParameter = NonNullable<Parameters<AgileClient['board']['getIssuesForBacklog']>[0]['fields']>

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
      const boards = await client.board.getAllBoards({
        maxResults,
        projectKeyOrId,
        startAt,
      })

      return {
        data: boards,
        success: true,
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        error: errorMessage,
        success: false,
      }
    }
  }

  /**
   * Get all sprints from a board
   */
  async getAllSprints(boardId: number, maxResults = 10, startAt?: number, state?: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const boards = await client.board.getAllSprints({
        boardId,
        maxResults,
        startAt,
        state,
      })

      return {
        data: boards,
        success: true,
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        error: errorMessage,
        success: false,
      }
    }
  }

  /**
   * Get all versions from a board
   */
  async getAllVersions(boardId: number, maxResults = 10, startAt?: number, released?: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const versions = await client.board.getAllVersions({
        boardId,
        maxResults,
        released,
        startAt,
      })

      return {
        data: versions,
        success: true,
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        error: errorMessage,
        success: false,
      }
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
      const result = await client.board.getBoardIssuesForSprint({
        boardId,
        fields: finalFields as unknown as FieldsParameter,
        jql,
        maxResults,
        nextPageToken,
        sprintId,
      })

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
      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        error: errorMessage,
        success: false,
      }
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
      const result = await client.board.getIssuesForBacklog({
        boardId,
        fields: finalFields as unknown as FieldsParameter,
        jql,
        maxResults,
        nextPageToken,
      })

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
      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        error: errorMessage,
        success: false,
      }
    }
  }
}
