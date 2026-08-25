import {type ApiResult, type AuthConfig, buildAuthHeader} from '@hesed/plugin-lib'
import fs from 'fs-extra'
import {type CloudClient, createCloudClient} from 'jira.js'
import {type Document} from 'jira.js/cloud'
import {type Client, createClient} from 'jira.js/core'
import {Buffer} from 'node:buffer'
import path from 'node:path'

import {markdownToAdfDocument} from '../markdown.js'
import {configureFetchProxy} from '../proxy.js'
import {defaultFields, processIssueRenderedAndFields} from '../utils.js'

/**
 * Jira API Utility Module
 * Provides core Jira API operations with formatting
 */
export class JiraApi {
  private client?: CloudClient
  private readonly config: AuthConfig
  private httpClient?: Client

  constructor(config: AuthConfig) {
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
        attachments: {
          content: fileContent,
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
  async addComment(issueIdOrKey: string, body: string, parentId?: string): Promise<ApiResult> {
    try {
      // Convert Markdown body to Jira ADF
      const bodyContent = markdownToAdfDocument(body)
      const response = await this.postComment(issueIdOrKey, bodyContent, parentId)

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
   * Add a comment with inline media (images/videos) to an issue.
   */
  async addCommentWithMedia(
    issueIdOrKey: string,
    body: string,
    filePaths: string[],
    parentId?: string,
  ): Promise<ApiResult> {
    try {
      // Convert Markdown body to ADF first so we can locate inline image references.
      const bodyContent = markdownToAdfDocument(body)

      // Collect external mediaSingle nodes keyed by basename (produced by ![alt](path) in markdown).
      const externalMediaByBasename = new Map<string, Array<Record<string, unknown>>>()
      this.collectExternalMedia(bodyContent.content ?? [], externalMediaByBasename)

      // Split attach paths: those referenced inline vs. those to append at the end.
      const inlinePaths = filePaths.filter((f) => externalMediaByBasename.has(path.basename(f)))
      const trailingPaths = filePaths.filter((f) => !externalMediaByBasename.has(path.basename(f)))

      // Upload all files in parallel.
      const uploadResults = await Promise.all(
        filePaths.map(async (filePath) => this.addAttachment(issueIdOrKey, filePath)),
      )
      const firstFailure = uploadResults.find((r) => !r.success)
      if (firstFailure) return firstFailure

      // Resolve media UUID for each uploaded file.
      const uuidByPath = new Map<string, string | undefined>()
      await Promise.all(
        filePaths.map(async (filePath, i) => {
          const attachments = uploadResults[i].data as Array<{content?: string; thumbnail?: string}>
          const att = Array.isArray(attachments) ? attachments[0] : undefined
          uuidByPath.set(filePath, await this.resolveMediaUUID(att?.thumbnail, att?.content))
        }),
      )

      // Replace inline external media nodes with resolved file media nodes.
      for (const filePath of inlinePaths) {
        const uuid = uuidByPath.get(filePath)
        if (!uuid) continue
        for (const attrs of externalMediaByBasename.get(path.basename(filePath)) ?? []) {
          delete attrs.url
          delete attrs.alt
          attrs.collection = ''
          attrs.id = uuid
          attrs.type = 'file'
        }
      }

      // Append trailing files (not referenced inline) as mediaSingle blocks at the end.
      bodyContent.content ??= []
      const trailingNodes = bodyContent.content
      for (const filePath of trailingPaths) {
        const uuid = uuidByPath.get(filePath)
        if (!uuid) continue
        trailingNodes.push({
          attrs: {layout: 'center'},
          content: [{attrs: {collection: '', id: uuid, type: 'file'}, type: 'media'}],
          type: 'mediaSingle',
        })
      }

      const response = await this.postComment(issueIdOrKey, bodyContent, parentId)

      return {data: response, success: true}
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return {error: errorMessage, success: false}
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
    this.httpClient = undefined
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
        processedFields.description = markdownToAdfDocument(fields.description)
      }

      const response = await client.issues.createIssue({fields: processedFields})

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

      const authHeader = buildAuthHeader(this.config)

      // Download the attachment content
      const response = await fetch(attachment.content, {
        headers: {
          Authorization: authHeader,
        },
      })

      if (!response.ok) {
        return {
          error: `ERROR: Failed to download attachment: ${response.status} ${response.statusText}`,
          success: false,
        }
      }

      // Determine output filename
      const filename = attachment.filename ?? `${issueIdOrKey}-${attachmentId}`
      const finalPath = outputPath ?? path.join(process.cwd(), filename)

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
  getClient(): CloudClient {
    this.client ??= createCloudClient(this.getHttpClient())

    return this.client
  }

  /**
   * Get or create the shared transport used by every generated API surface.
   *
   * One client means one set of credentials and, under OAuth 2.0, one token state —
   * and it is what raw `sendRequest` calls go through for the endpoints the generated
   * surface does not cover.
   */
  private getHttpClient(): Client {
    if (this.httpClient) {
      return this.httpClient
    }

    configureFetchProxy(this.config.host!)

    this.httpClient = createClient({
      auth: this.config.email
        ? {apiToken: this.config.apiToken, email: this.config.email, type: 'basic'}
        : {token: this.config.apiToken, type: 'bearer'},
      host: this.config.host!,
    })

    return this.httpClient
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
   * Get development detail for an issue (branches, commits, pull requests)
   */
  async getIssueDevelopment(issueId: string, applicationType: string, dataType: string): Promise<ApiResult> {
    try {
      // No generated client method covers this endpoint, so the request goes through fetch
      // directly — which means the proxy dispatcher has to be installed here, rather than
      // by the transport this method never builds.
      configureFetchProxy(this.config.host!)

      const authHeader = buildAuthHeader(this.config)
      const url = `${this.config.host}/rest/dev-status/latest/issue/detail?issueId=${issueId}&applicationType=${applicationType}&dataType=${dataType}`
      const res = await fetch(url, {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      })

      if (!res.ok) {
        return {
          error: `HTTP ${res.status}: ${res.statusText}`,
          success: false,
        }
      }

      const data = await res.json()
      return {
        data,
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
      const result = await client.issueSearch.searchAndReconsileIssuesUsingJql({
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
      const bodyContent = markdownToAdfDocument(body)

      const response = await client.issueComments.updateComment({
        body: {body: bodyContent},
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

      // Fetch schemas only for the custom fields being updated to determine which require ADF.
      // System fields like 'description' are always treated as ADF (fallback set).
      const customFieldIds = Object.keys(fields).filter((k) => k.startsWith('customfield_'))
      const adfFieldIds = new Set<string>(['description'])
      if (customFieldIds.length > 0) {
        try {
          const page = await client.issueFields.getFieldsPaginated({id: customFieldIds, type: ['custom']})
          const adfFields = (page.values ?? []).filter(
            (f) =>
              f.schema?.type === 'any' ||
              f.schema?.custom?.includes('textarea') ||
              f.schema?.custom?.includes('multilinetexteditor'),
          )
          for (const f of adfFields) {
            adfFieldIds.add(f.id)
          }
        } catch {
          // non-fatal — proceed with fallback set
        }
      }

      const processedFields = Object.fromEntries(
        Object.entries(fields).map(([key, value]) => {
          if (typeof value === 'string') {
            const trimmed = value.trim()
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
              try {
                return [key, JSON.parse(trimmed)]
              } catch {
                // fall through to plain string / ADF conversion below
              }
            }

            if (adfFieldIds.has(key)) {
              return [key, markdownToAdfDocument(value)]
            }
          }

          return [key, value]
        }),
      ) as typeof fields

      await client.issues.editIssue({fields: processedFields, issueIdOrKey})

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
   * Walk ADF nodes and collect external mediaSingle nodes
   * (from ![alt](url) markdown images)
   */
  private collectExternalMedia(
    nodes: Array<Record<string, unknown>>,
    map: Map<string, Array<Record<string, unknown>>>,
  ): void {
    for (const node of nodes) {
      const content = node.content as Array<Record<string, unknown>> | undefined
      const media = node.type === 'mediaSingle' ? content?.[0] : undefined
      const attrs = media?.type === 'media' ? (media.attrs as Record<string, unknown> | undefined) : undefined

      if (attrs?.type === 'external' && typeof attrs.url === 'string') {
        const base = path.basename(attrs.url)
        const list = map.get(base) ?? []
        list.push(attrs)
        if (!map.has(base)) map.set(base, list)
        continue
      }

      if (content) this.collectExternalMedia(content, map)
    }
  }

  /**
   * POST a comment, keeping `parentId` on the wire for threaded replies.
   *
   * The generated `issueComments.addComment` builds its request body from the fields it
   * declares, and `parentId` is not one of them — a reply sent through it would silently
   * become a top-level comment. Send that case through the shared transport instead.
   */
  private async postComment(issueIdOrKey: string, body: Document, parentId?: string): Promise<unknown> {
    if (!parentId) {
      return this.getClient().issueComments.addComment({body, issueIdOrKey})
    }

    return this.getHttpClient().sendRequest({
      body: {body, parentId},
      method: 'POST',
      url: `/rest/api/3/issue/${issueIdOrKey}/comment`,
    })
  }

  /**
   * Add a worklog to an issue
   */
  async worklog(issueIdOrKey: string, started: string, timeSpent: string, body?: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      // Convert Markdown body to Jira ADF
      const bodyContent = body ? markdownToAdfDocument(body) : undefined

      const response = await client.issueWorklogs.addWorklog({
        comment: bodyContent,
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

  /**
   * Resolve Media UUID for an attachment by following
   * the proxy redirect to api.media.atlassian.com
   *
   * Returns null if the UUID cannot be determined
   * (e.g. non-media files with no thumbnail)
   */
  private async resolveMediaUUID(thumbnailUrl?: string, contentUrl?: string): Promise<string | undefined> {
    const tryUrl = async (proxyUrl: string): Promise<string | undefined> => {
      try {
        const authHeader = buildAuthHeader(this.config)
        const res = await fetch(proxyUrl, {
          headers: {Authorization: authHeader},
        })
        // Final URL after redirect: https://api.media.atlassian.com/file/{UUID}/...
        const match = /\/file\/([0-9a-f-]{36})\//i.exec(res.url)
        return match ? match[1] : undefined
      } catch {
        return undefined
      }
    }

    return (thumbnailUrl && (await tryUrl(thumbnailUrl))) || (contentUrl && (await tryUrl(contentUrl))) || undefined
  }
}
