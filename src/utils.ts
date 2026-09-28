import {type Issue} from 'jira.js/cloud'
import TurndownService from 'turndown'

import {type AdfAttachment, adfToMarkdown, codeSpan, isAdfDocument} from './adf-to-markdown.js'

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

/**
 * Replace every ADF document found in `value` (at any depth) with its Markdown,
 * so rich-text custom fields, comment bodies and worklog comments never leak as
 * raw ADF JSON.
 */
const convertAdf = (value: unknown, attachments: readonly AdfAttachment[]): unknown => {
  if (isAdfDocument(value)) return adfToMarkdown(value, {attachments})
  if (Array.isArray(value)) return value.map((item) => convertAdf(item, attachments))
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, convertAdf(item, attachments)]))
  }

  return value
}

const createTurndownService = (): TurndownService => {
  const turndownService = new TurndownService()

  // Text is emitted verbatim: markers such as `[minion:plan]` must survive exactly.
  turndownService.escape = (text) => text

  // Jira renders ADF code blocks as a bare `<pre>` (optionally `class="code-<lang>"`)
  // with no inner <code> element, so turndown's built-in code-block rules (which require
  // node.firstChild.nodeName === 'CODE') never match. Restore it as a fenced block.
  turndownService.addRule('jiraCodeBlock', {
    filter: (node) => node.nodeName === 'PRE' && node.firstChild?.nodeName !== 'CODE',
    replacement(_content, node) {
      const language = /code-(\S+)/.exec(node.getAttribute('class') ?? '')?.[1]
      const code = node.textContent ?? ''
      let longestBacktickRun = 0
      for (const run of code.match(/`+/g) ?? []) {
        longestBacktickRun = Math.max(longestBacktickRun, run.length)
      }

      const fence = '`'.repeat(Math.max(3, longestBacktickRun + 1))
      return `\n\n${fence}${language && language !== 'generic' ? language : ''}\n${code}\n${fence}\n\n`
    },
  })

  // Jira renders ADF inline `code` marks as <tt>.
  turndownService.addRule('jiraInlineCode', {
    filter: (node) => node.nodeName === 'TT',
    replacement: (content) => codeSpan(content),
  })

  return turndownService
}

/** The issue's attachments, used to link media embedded in its rich text. */
const attachmentsOf = (fields: Record<string, unknown>): AdfAttachment[] =>
  Array.isArray(fields.attachment) ? (fields.attachment as AdfAttachment[]) : []

const isEmptyCustomField = (key: string, value: unknown): boolean =>
  key.startsWith('customfield_') && ['', null, undefined].includes(value as null | string | undefined)

/**
 * Normalise an issue for output: rich-text (ADF) fields become Markdown strings,
 * empty custom fields are dropped, and `renderedFields` is emptied.
 *
 * Raw `fields` always win. `renderedFields` (only present when a caller asked for
 * it) is a fallback for keys the raw fields lack, so it can never replace raw ISO
 * timestamps with humanised text such as "Today 12:02 AM".
 */
export const processIssueRenderedAndFields = (issue: Issue): void => {
  const fieldsObj = (issue.fields || {}) as Record<string, unknown>
  const renderedFields = (issue.renderedFields ?? {}) as Record<string, unknown>
  const merged: Record<string, unknown> = {}
  const attachments = attachmentsOf(fieldsObj)

  for (const [key, value] of Object.entries(fieldsObj)) {
    if (!isEmptyCustomField(key, value)) {
      merged[key] = convertAdf(value, attachments)
    }
  }

  let turndownService: TurndownService | undefined
  const turndown = (html: unknown): string => {
    turndownService ??= createTurndownService()
    return turndownService.turndown(String(html ?? ''))
  }

  for (const [key, value] of Object.entries(renderedFields)) {
    if (isEmptyCustomField(key, value) || (merged[key] !== null && merged[key] !== undefined)) continue

    if (key === 'description') {
      merged[key] = turndown(value)
    } else if (key === 'comment' && value && typeof value === 'object' && 'comments' in value) {
      merged[key] = Array.isArray(value.comments)
        ? {
            ...value,
            comments: value.comments.map((c: {body?: string}) => (c.body ? {...c, body: turndown(c.body)} : c)),
          }
        : value
    } else if (value !== null && value !== undefined) {
      merged[key] = value
    }
  }

  // The description is always a string in the output, even when Jira has none.
  if ('description' in merged && (merged.description === null || merged.description === undefined)) {
    merged.description = ''
  }

  issue.fields = merged as typeof issue.fields
  issue.renderedFields = {}
}

/**
 * Parse repeated `key=value` flag values into a map, splitting on the first `=`
 * so a value may itself contain `=`.
 */
export const parseKeyValuePairs = (pairs: readonly string[] = []): Record<string, string> => {
  const result: Record<string, string> = {}
  for (const pair of pairs) {
    const [key, ...valueParts] = pair.split('=')
    result[key] = valueParts.join('=')
  }

  return result
}

/**
 * The error for keys given in both `--fields` and `--text-fields`, so neither
 * value is picked silently; `undefined` when the two maps don't overlap.
 */
export const duplicateFieldsError = (
  fields: Record<string, unknown>,
  textFields: Record<string, unknown>,
): string | undefined => {
  const duplicates = Object.keys(textFields).filter((key) => Object.hasOwn(fields, key))
  return duplicates.length > 0
    ? `Field(s) given in both --fields and --text-fields: ${duplicates.join(', ')}`
    : undefined
}
