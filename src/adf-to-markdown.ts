/**
 * Convert Atlassian Document Format (ADF) straight to Markdown.
 *
 * Jira's `renderedFields` HTML loses information the ADF still carries — code
 * block languages, inline-code marks (rendered as `<tt>`), raw text that the
 * wiki renderer wraps in error spans — so reading goes through the ADF tree.
 *
 * Text is emitted verbatim: nothing is backslash-escaped, because the output is
 * read by people and LLMs, and markers such as `[minion:plan]` must survive
 * exactly. The one exception is `|` inside table cells, which would otherwise
 * split the cell.
 */

type AdfMark = {attrs?: Record<string, unknown>; type: string}

export type AdfNode = {
  attrs?: Record<string, unknown>
  content?: AdfNode[]
  marks?: AdfMark[]
  text?: string
  type: string
}

/** Marks that wrap text in delimiters, outermost first. `code` is handled per node. */
const WRAPPING_MARKS = ['strong', 'em', 'strike', 'link'] as const

const INLINE_TYPES = new Set([
  'date',
  'emoji',
  'hardBreak',
  'inlineCard',
  'inlineExtension',
  'mediaInline',
  'mention',
  'placeholder',
  'status',
  'text',
])

/** True for an ADF document object, as Jira returns rich-text fields. */
export function isAdfDocument(value: unknown): value is AdfNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as AdfNode).type === 'doc' &&
    Array.isArray((value as AdfNode).content)
  )
}

function attr(node: AdfNode, key: string): string | undefined {
  const value = node.attrs?.[key]
  return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined
}

function longestRun(text: string, character: string): number {
  let longest = 0
  let current = 0
  for (const c of text) {
    current = c === character ? current + 1 : 0
    longest = Math.max(longest, current)
  }

  return longest
}

function codeSpan(text: string): string {
  const fence = '`'.repeat(longestRun(text, '`') + 1)
  // Pad when the code starts or ends with a backtick, so the fence stays separate.
  const pad = text.startsWith('`') || text.endsWith('`') ? ' ' : ''
  return `${fence}${pad}${text}${pad}${fence}`
}

function indent(text: string, prefix: string, firstPrefix = prefix): string {
  return text
    .split('\n')
    .map((line, index) => {
      if (index === 0) return `${firstPrefix}${line}`
      return line === '' ? '' : `${prefix}${line}`
    })
    .join('\n')
}

function quote(text: string): string {
  return text
    .split('\n')
    .map((line) => (line === '' ? '>' : `> ${line}`))
    .join('\n')
}

function plainText(node: AdfNode): string {
  if (node.type === 'text') return node.text ?? ''
  return (node.content ?? []).map((child) => plainText(child)).join('')
}

function markKey(mark: AdfMark): string {
  return mark.type === 'link' ? `link:${attr({attrs: mark.attrs, type: ''}, 'href') ?? ''}` : mark.type
}

function openMark(mark: AdfMark): string {
  switch (mark.type) {
    case 'em': {
      return '*'
    }

    case 'link': {
      return '['
    }

    case 'strike': {
      return '~~'
    }

    default: {
      return '**'
    }
  }
}

function closeMark(mark: AdfMark): string {
  if (mark.type === 'link') return `](${String(mark.attrs?.href ?? '')})`
  return openMark(mark)
}

function cardUrl(node: AdfNode): string {
  return attr(node, 'url') ?? (node.attrs?.data as undefined | {url?: string})?.url ?? ''
}

const INLINE_RENDERERS: Record<string, (node: AdfNode) => string> = {
  date(node) {
    const timestamp = Number(attr(node, 'timestamp'))
    return Number.isFinite(timestamp) ? new Date(timestamp).toISOString().slice(0, 10) : ''
  },
  emoji: (node) => attr(node, 'text') ?? attr(node, 'shortName') ?? '',
  hardBreak: () => '\n',
  inlineCard: cardUrl,
  mediaInline: (node) => renderMedia(node),
  mention(node) {
    const text = attr(node, 'text') ?? attr(node, 'id') ?? ''
    return text.startsWith('@') ? text : `@${text}`
  },
  status: (node) => attr(node, 'text') ?? '',
}

function renderInlineAtom(node: AdfNode): string {
  const render = INLINE_RENDERERS[node.type]
  if (render) return render(node)
  if (node.content) return renderInline(node.content)
  return attr(node, 'text') ?? ''
}

/**
 * Render a run of inline nodes. Wrapping marks are opened and closed across
 * node boundaries, so bold text containing a link reads `**a [b](x) c**`
 * rather than three separately wrapped fragments. Whitespace at a node's edge
 * is kept outside the delimiters, where Markdown needs it.
 */
function renderInline(nodes: AdfNode[]): string {
  let out = ''
  let active: AdfMark[] = []
  let pendingSpace = ''

  const transition = (marks: AdfMark[]): void => {
    let common = 0
    while (common < active.length && common < marks.length && markKey(active[common]) === markKey(marks[common])) {
      common++
    }

    for (let i = active.length - 1; i >= common; i--) out += closeMark(active[i])
    out += pendingSpace
    pendingSpace = ''
    for (let i = common; i < marks.length; i++) out += openMark(marks[i])
    active = marks
  }

  for (const node of nodes) {
    // Marks already open stay outermost, so a run of bold text is not split by a link inside it.
    const wanted = WRAPPING_MARKS.flatMap((type) => (node.marks ?? []).filter((mark) => mark.type === type))
    const kept = active.filter((mark) => wanted.some((other) => markKey(other) === markKey(mark)))
    const marks = [...kept, ...wanted.filter((mark) => kept.every((other) => markKey(other) !== markKey(mark)))]
    const isCode = (node.marks ?? []).some((mark) => mark.type === 'code')
    let text = node.type === 'text' ? (node.text ?? '') : renderInlineAtom(node)

    if (node.type === 'hardBreak') {
      // A line break closes nothing; keep it inside whatever is open.
      out += pendingSpace + text
      pendingSpace = ''
      continue
    }

    if (isCode) {
      transition(marks)
      out += codeSpan(text)
      continue
    }

    const lead = /^\s*/.exec(text)?.[0] ?? ''
    if (lead.length === text.length) {
      pendingSpace += text
      continue
    }

    text = text.slice(lead.length)
    const trail = /\s*$/.exec(text)?.[0] ?? ''
    text = text.slice(0, text.length - trail.length)

    pendingSpace += lead
    transition(marks)
    out += text
    pendingSpace = trail
  }

  transition([])
  return out + pendingSpace
}

function renderMedia(node: AdfNode): string {
  const label = attr(node, 'alt') ?? attr(node, 'filename') ?? attr(node, 'id') ?? attr(node, 'url') ?? 'media'
  return `[attachment: ${label}]`
}

function renderList(node: AdfNode): string {
  const isOrdered = node.type === 'orderedList'
  let number = Number(attr(node, 'order') ?? 1)
  if (!Number.isFinite(number)) number = 1

  return (node.content ?? [])
    .map((item) => {
      let marker = '- '
      if (isOrdered) marker = `${number++}. `
      else if (item.type === 'taskItem') marker = attr(item, 'state') === 'DONE' ? '- [x] ' : '- [ ] '

      const body = renderListItem(item)
      return indent(body, ' '.repeat(isOrdered ? marker.length : 2), marker)
    })
    .join('\n')
}

function renderListItem(item: AdfNode): string {
  const children = item.content ?? []
  // taskItem holds inline content directly.
  if (children.some((child) => INLINE_TYPES.has(child.type))) return renderInline(children)

  let out = ''
  for (const [index, child] of children.entries()) {
    const rendered = renderBlock(child)
    if (index > 0) out += isList(child) ? '\n' : '\n\n'
    out += rendered
  }

  return out
}

function isList(node: AdfNode): boolean {
  return ['bulletList', 'orderedList', 'taskList'].includes(node.type)
}

function renderCell(cell: AdfNode): string {
  return renderBlocks(cell.content ?? [])
    .replaceAll('|', String.raw`\|`)
    .replaceAll('\n\n', '<br><br>')
    .replaceAll('\n', '<br>')
}

function renderTable(node: AdfNode): string {
  const rows = (node.content ?? []).filter((row) => row.type === 'tableRow')
  if (rows.length === 0) return ''

  const cells = rows.map((row) => (row.content ?? []).map((cell) => renderCell(cell)))
  const width = Math.max(...cells.map((row) => row.length))
  const line = (row: string[]): string =>
    `| ${Array.from({length: width}, (_, index) => row[index] ?? '').join(' | ')} |`

  const isFirstRowHeader = (rows[0].content ?? []).every((cell) => cell.type === 'tableHeader')
  const header = isFirstRowHeader ? cells[0] : Array.from({length: width}, () => '')
  const body = isFirstRowHeader ? cells.slice(1) : cells

  const separator = `| ${Array.from({length: width}, () => '---').join(' | ')} |`
  return [line(header), separator, ...body.map((row) => line(row))].join('\n')
}

function renderMediaGroup(node: AdfNode): string {
  return (node.content ?? [])
    .map((child) => (child.type === 'caption' ? renderInline(child.content ?? []) : renderMedia(child)))
    .filter(Boolean)
    .join('\n')
}

function renderCodeBlock(node: AdfNode): string {
  const code = plainText(node)
  const fence = '`'.repeat(Math.max(3, longestRun(code, '`') + 1))
  return `${fence}${attr(node, 'language') ?? ''}\n${code}\n${fence}`
}

function renderExpand(node: AdfNode): string {
  const title = attr(node, 'title')
  const body = renderBlocks(node.content ?? [])
  return title ? `**${title}**\n\n${body}` : body
}

function renderHeading(node: AdfNode): string {
  const requested = Number(attr(node, 'level') ?? 1) || 1
  const level = Math.min(6, Math.max(1, requested))
  return `${'#'.repeat(level)} ${renderInline(node.content ?? [])}`
}

const renderQuote = (node: AdfNode): string => quote(renderBlocks(node.content ?? []))

const BLOCK_RENDERERS: Record<string, (node: AdfNode) => string> = {
  blockCard: cardUrl,
  blockquote: renderQuote,
  bulletList: (node) => renderList(node),
  codeBlock: renderCodeBlock,
  embedCard: cardUrl,
  expand: renderExpand,
  heading: renderHeading,
  media: (node) => renderMedia(node),
  mediaGroup: renderMediaGroup,
  mediaSingle: renderMediaGroup,
  nestedExpand: renderExpand,
  orderedList: (node) => renderList(node),
  panel: renderQuote,
  paragraph: (node) => renderInline(node.content ?? []),
  rule: () => '---',
  table: (node) => renderTable(node),
  taskList: (node) => renderList(node),
}

function renderBlock(node: AdfNode): string {
  const render = BLOCK_RENDERERS[node.type]
  if (render) return render(node)

  // Unknown node: recurse so its text is never dropped.
  const children = node.content ?? []
  if (children.length === 0) return INLINE_TYPES.has(node.type) ? renderInlineAtom(node) : (attr(node, 'text') ?? '')
  if (children.some((child) => INLINE_TYPES.has(child.type))) return renderInline(children)
  return renderBlocks(children)
}

function renderBlocks(nodes: AdfNode[]): string {
  const out: string[] = []
  let index = 0
  while (index < nodes.length) {
    const node = nodes[index]
    // Consecutive inline nodes at block level form one line of text.
    if (INLINE_TYPES.has(node.type)) {
      const run: AdfNode[] = []
      while (index < nodes.length && INLINE_TYPES.has(nodes[index].type)) run.push(nodes[index++])
      out.push(renderInline(run))
      continue
    }

    out.push(renderBlock(node))
    index++
  }

  return out.filter((block) => block.trim() !== '').join('\n\n')
}

/** Convert an ADF document (or any ADF node) to Markdown. */
export function adfToMarkdown(doc: AdfNode | null | undefined): string {
  if (!doc) return ''
  if (doc.type === 'doc') return renderBlocks(doc.content ?? [])
  return renderBlocks([doc])
}
