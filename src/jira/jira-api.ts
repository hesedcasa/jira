import fs from 'fs-extra'
import {Version3Client} from 'jira.js'
import {markdownToAdf} from 'marklassian'
import path from 'node:path'

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

/**
 * Jira API Utility Module
 * Provides core Jira API operations with formatting
 */
export class JiraApi {
  private client?: Version3Client
  private config: Config

  constructor(config: Config) {
    this.config = config
  }

  /**
   * Add an attachment to an issue
   */
  async addAttachment(issueIdOrKey: string, filePath: string): Promise<ApiResult> {
    try {
      // Validate file exists
      if (!fs.existsSync(filePath)) {
        return {
          error: `File not found: ${filePath}`,
          success: false,
        }
      }

      // Check file size (10MB limit, typical for Jira Cloud)
      const stats = fs.statSync(filePath)
      const maxFileSizeBytes = 10 * 1024 * 1024 // 10MB
      if (stats.size > maxFileSizeBytes) {
        return {
          error: `File size (${(stats.size / 1024 / 1024).toFixed(2)}MB) exceeds the 10MB limit`,
          success: false,
        }
      }

      const client = this.getClient()
      const fileContent = fs.readFileSync(filePath)
      const fileName = path.basename(filePath)

      const response = await client.issueAttachments.addAttachment({
        attachment: {
          file: fileContent,
          filename: fileName,
        },
        issueIdOrKey,
      })

      return {
        data: response,
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
   * Add a comment to an issue
   */
  async addComment(issueIdOrKey: string, body: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      // Convert Markdown body to Jira ADF
      // eslint-disable-next-line unicorn/prefer-string-replace-all
      const bodyContent = markdownToAdf(body.replace(/\\n/g, '\n'))

      const response = await client.issueComments.addComment({
        comment: bodyContent as Parameters<typeof client.issueComments.addComment>[0]['comment'],
        issueIdOrKey,
      })

      return {
        data: response,
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
   * Assigns an issue to a user
   */
  async assignIssue(accountId: string, issueIdOrKey: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      await client.issues.assignIssue({accountId, issueIdOrKey})

      return {
        data: true,
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
   * Clear client (for cleanup)
   */
  clearClients(): void {
    this.client = undefined
  }

  /**
   * Create a new issue
   */
  async createIssue(fields: Record<string, unknown>): Promise<ApiResult> {
    try {
      const client = this.getClient()

      // Parse JSON-encoded strings for individual fields
      const processedFields = Object.fromEntries(
        Object.entries(fields).map(([key, value]) => {
          if (typeof value === 'string') {
            const trimmed = value.trim()
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
              try {
                return [key, JSON.parse(trimmed)]
              } catch {
                // If parsing fails, keep the original string value
                return [key, value]
              }
            }
          }

          return [key, value]
        }),
      ) as typeof fields
      // Convert Markdown description to Jira ADF
      if (typeof fields.description === 'string') {
        // eslint-disable-next-line unicorn/prefer-string-replace-all
        processedFields.description = markdownToAdf(fields.description.replace(/\\n/g, '\n'))
      }

      const response = await client.issues.createIssue({
        fields: processedFields as Parameters<typeof client.issues.createIssue>[0]['fields'],
      })

      return {
        data: response,
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
   * Delete a comment of an issue
   */
  async deleteComment(id: string, issueIdOrKey: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      await client.issueComments.deleteComment({id, issueIdOrKey})

      return {
        data: true,
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
   * Delete an issue
   */
  async deleteIssue(issueIdOrKey: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      await client.issues.deleteIssue({issueIdOrKey})

      return {
        data: true,
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
   * Delete a worklog from an issue
   */
  async deleteWorklog(id: string, issueIdOrKey: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      await client.issueWorklogs.deleteWorklog({id, issueIdOrKey})

      return {
        data: true,
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
   * Performs an issue transition
   */
  async doTransition(issueIdOrKey: string, transitionId: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      await client.issues.doTransition({issueIdOrKey, transition: {id: transitionId}})

      return {
        data: true,
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
   * Download attachment from an issue
   */
  async downloadAttachment(issueIdOrKey: string, attachmentId: string, outputPath?: string): Promise<ApiResult> {
    try {
      const client = this.getClient()

      // Get attachment metadata
      const attachment = await client.issueAttachments.getAttachment({id: attachmentId})

      if (!attachment.content) {
        return {
          error: `ERROR: Attachment ${attachmentId} has no content URL`,
          success: false,
        }
      }

      // Build Basic auth header from config
      const authString = Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64')

      // Download the attachment content
      // eslint-disable-next-line n/no-unsupported-features/node-builtins -- fetch is available in Node 18+
      const response = await fetch(attachment.content, {
        headers: {
          Authorization: `Basic ${authString}`,
        },
      })

      if (!response.ok) {
        return {
          error: `ERROR: Failed to download attachment: ${response.status} ${response.statusText}`,
          success: false,
        }
      }

      // Determine output filename
      const filename = attachment.filename || `${issueIdOrKey}-${attachmentId}`
      const finalPath = outputPath || path.join(process.cwd(), filename)

      // Save to file
      const buffer = Buffer.from(await response.arrayBuffer())
      fs.writeFileSync(finalPath, buffer)

      return {
        data: {
          attachmentId: attachment.id,
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          savedTo: finalPath,
          size: attachment.size,
        },
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
   * List users that can be assigned to an issue
   */
  async findAssignableUsers(issueKey: string, query?: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const users = await client.userSearch.findAssignableUsers({issueKey, query})

      return {
        data: users,
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
   * Get or create Jira client
   */
  getClient(): Version3Client {
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

    this.client = new Version3Client(options)

    return this.client
  }

  /**
   * Get issue details
   */
  async getIssue(issueIdOrKey: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const issue = await client.issues.getIssue({expand: 'renderedFields', issueIdOrKey})

      processIssueRenderedAndFields(issue)

      return {
        data: issue,
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
   * Get worklogs for an issue (ordered by created time)
   */
  async getIssueWorklog(issueIdOrKey: string, maxResults = 10, startAt?: number): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const worklogs = await client.issueWorklogs.getIssueWorklog({
        issueIdOrKey,
        maxResults,
        startAt,
      })

      return {
        data: worklogs,
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
   * Get project details
   */
  async getProject(projectIdOrKey: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const project = await client.projects.getProject({projectIdOrKey})

      return {
        data: project,
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
   * Get transitions that can be performed by the user on an issue
   */
  async getTransitions(issueIdOrKey: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const transitions = await client.issues.getTransitions({issueIdOrKey})

      return {
        data: transitions,
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
   * Get user information
   */
  async getUser(accountId?: string, query?: string): Promise<ApiResult> {
    try {
      const client = this.getClient()

      if (accountId === undefined && query === undefined) {
        const currentUser = await client.myself.getCurrentUser()
        return {
          data: currentUser,
          success: true,
        }
      }

      const users = await client.userSearch.findUsers({accountId, query})

      if (users) {
        return {
          data: users[0] ?? null,
          success: true,
        }
      }

      const user = await client.myself.getCurrentUser()
      return {
        data: user,
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
   * List all projects
   */
  async listProjects(): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const response = await client.projects.searchProjects()

      // Simplify project data for display
      const projects = response.values || []
      const simplifiedProjects = projects.map(
        (p: {id?: string; key?: string; name?: string; projectTypeKey?: string}) => ({
          id: p.id,
          key: p.key,
          name: p.name,
          projectTypeKey: p.projectTypeKey,
        }),
      )

      return {
        data: simplifiedProjects,
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
   * Search issues using JQL
   */
  async searchIssues(jql: string, maxResults = 10, nextPageToken?: string, fields?: string[]): Promise<ApiResult> {
    try {
      const finalFields = [...new Set<string>([...(fields ?? []), ...defaultFields])]
      const client = this.getClient()
      const result = await client.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
        expand: 'renderedFields',
        failFast: true,
        fields: finalFields,
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

  /**
   * Test Jira API connection
   */
  async testConnection(): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const serverInfo = await client.serverInfo.getServerInfo()
      const currentUser = await client.myself.getCurrentUser()

      return {
        data: {currentUser, serverInfo},
        success: true,
      }
    } catch (error: unknown) {
      return {
        error: error instanceof Error ? error.message : error,
        success: false,
      }
    }
  }

  /**
   * Update a comment of an issue
   */
  async updateComment(id: string, issueIdOrKey: string, body: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      // Convert Markdown body to Jira ADF
      // eslint-disable-next-line unicorn/prefer-string-replace-all
      const bodyContent = markdownToAdf(body.replace(/\\n/g, '\n'))

      const response = await client.issueComments.updateComment({
        body: bodyContent as Parameters<typeof client.issueComments.updateComment>[0]['body'],
        id,
        issueIdOrKey,
      })

      return {
        data: response,
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
   * Update an existing issue
   */
  async updateIssue(issueIdOrKey: string, fields: Record<string, unknown>): Promise<ApiResult> {
    try {
      const client = this.getClient()
      // Parse JSON-encoded strings for individual fields
      const processedFields = Object.fromEntries(
        Object.entries(fields).map(([key, value]) => {
          if (typeof value === 'string') {
            const trimmed = value.trim()
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
              try {
                return [key, JSON.parse(trimmed)]
              } catch {
                // If parsing fails, keep the original string value
                return [key, value]
              }
            }
          }

          return [key, value]
        }),
      ) as typeof fields
      // Convert Markdown description to Jira ADF
      if (typeof fields.description === 'string') {
        // eslint-disable-next-line unicorn/prefer-string-replace-all
        processedFields.description = markdownToAdf(fields.description.replace(/\\n/g, '\n'))
      }

      await client.issues.editIssue({
        fields: processedFields as Parameters<typeof client.issues.editIssue>[0]['fields'],
        issueIdOrKey,
      })

      return {
        data: true,
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
   * Add a worklog to an issue
   */
  async worklog(issueIdOrKey: string, started: string, timeSpent: string, body?: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      // Convert Markdown body to Jira ADF
      // eslint-disable-next-line unicorn/prefer-string-replace-all
      const bodyContent = body ? markdownToAdf(body.replace(/\\n/g, '\n')) : undefined

      const response = await client.issueWorklogs.addWorklog({
        comment: bodyContent as Parameters<typeof client.issueWorklogs.addWorklog>[0]['comment'],
        issueIdOrKey,
        started,
        timeSpent,
      })

      return {
        data: response,
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
