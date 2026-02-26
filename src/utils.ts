import {Issue} from 'jira.js/version3/models/issue'
import TurndownService from 'turndown'

export const defaultFields = [
  'summary',
  'description',
  'status',
  'assignee',
  'reporter',
  'labels',
  'priority',
  'issuetype',
]

export const processIssueRenderedAndFields = (issue: Issue): void => {
  const turndownService = new TurndownService()

  // Filter renderedFields first
  if (issue.renderedFields) {
    issue.renderedFields = Object.fromEntries(
      Object.entries(issue.renderedFields).filter(
        ([key, value]) => !key.startsWith('customfield_') || (value !== null && value !== ''),
      ),
    ) as typeof issue.renderedFields
  }

  // Replace description in renderedFields
  if (issue.renderedFields) {
    const rf = issue.renderedFields as Record<string, unknown>
    rf.description = turndownService.turndown(String(rf.description ?? ''))

    // Process all comments' body
    if (rf.comment && typeof rf.comment === 'object' && 'comments' in rf.comment) {
      const commentObj = rf.comment as {comments: Array<{body?: string}>}
      if (Array.isArray(commentObj.comments)) {
        commentObj.comments = commentObj.comments.map((c) =>
          c.body ? {...c, body: turndownService.turndown(String(c.body))} : c,
        )
      }
    }
  }

  // Merge non-empty issue fields and renderedFields into a unified fields object
  const renderedFields = (issue.renderedFields || {}) as Record<string, unknown>
  const fieldsObj = (issue.fields || {}) as Record<string, unknown>
  const merged: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(fieldsObj)) {
    if (!key.startsWith('customfield_') || (value !== null && value !== '')) {
      merged[key] = value
    }
  }

  for (const [key, value] of Object.entries(renderedFields)) {
    if (!key.startsWith('customfield_') || (value !== null && value !== '')) {
      merged[key] = value || merged[key]
    }
  }

  issue.fields = merged as typeof issue.fields
  issue.renderedFields = {} as typeof issue.renderedFields
}
