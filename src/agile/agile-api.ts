import {AgileClient} from 'jira.js'
import {Issue} from 'jira.js/version3/models/issue'

import {defaultFields, processIssueRenderedAndFields} from '../utils.js'

/**
 * Generic API result
 */
export interface ApiResult {
  data?: unknown
  error?: unknown
  success: boolean
}

export interface Config {
  apiToken: string
  email: string
  host: string
}

interface PaginateResult {
  expand?: string
  issues?: Issue[]
  maxResults?: number
  startAt?: number
  total?: number
}

/**
 * Agile API Utility Module
 * Provides core Agile API operations with formatting
 */
export class AgileApi {
  private client?: AgileClient
  private config: Config

  constructor(config: Config) {
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
    startAt?: number,
    fields?: string[],
  ): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const finalFields = [...new Set<string>([...(fields ?? []), ...defaultFields])]
      const result = await client.board.getBoardIssuesForSprint<PaginateResult>({
        boardId,
        fields: finalFields,
        jql,
        maxResults,
        sprintId,
        startAt,
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
        data: result.issues,
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

    const options = {
      authentication: {
        basic: {
          apiToken: this.config.apiToken,
          email: this.config.email,
        },
      },
      host: this.config.host,
    }

    this.client = new AgileClient(options)

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
    startAt?: number,
    fields?: string[],
  ): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const finalFields = [...new Set<string>([...(fields ?? []), ...defaultFields])]
      const result = await client.board.getIssuesForBacklog<PaginateResult>({
        boardId,
        fields: finalFields,
        jql,
        maxResults,
        startAt,
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
        data: result.issues,
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
