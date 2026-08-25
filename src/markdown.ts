import {type Document} from 'jira.js/cloud'
import {lexer} from 'marked'
import {markdownToAdf} from 'marklassian'

/** Blocks whose newlines are line breaks the user typed, not markdown syntax. */
const TEXT_BLOCKS = new Set(['blockquote', 'list', 'paragraph'])

/** Opens or closes a fenced code block, ignoring blockquote markers and indent. */
const FENCE = /^[\s>]*(```|~~~)/

/** Already ends in a hard break (two spaces or a backslash), so leave it alone. */
const HARD_BREAK_END = /( {2,}|\\)$/

/** Blank, or blank apart from blockquote markers — ends the block, no break needed. */
const BLANK = /^[\s>]*$/

/** Leading blockquote markers, so a quoted line's own indentation can be measured. */
const QUOTE_MARKERS = /^(?:\s*>)+/

/** A list item marker — its width is where the item's own content starts. */
const LIST_MARKER = /^[\t ]*(?:[*+-]|\d+[).])[\t ]+/

/** Columns of indentation past the enclosing block that start an indented code block. */
const INDENTED_CODE = 4

/**
 * Starts a new block — list item, heading, fence, table row, setext underline or
 * thematic break. The newline before it is markdown syntax, not a line break.
 */
const NEW_BLOCK = /^[\s>]*(?:[*+-]\s|\d+[).]\s|#{1,6}\s|```|~~~|\||={2,}\s*$|-{3,}\s*$)/

/** Width of a run of leading whitespace in columns, counting a tab as four. */
function widthOf(text: string): number {
  return [...text].reduce((total, character) => total + (character === '\t' ? INDENTED_CODE : 1), 0)
}

/** A line's own content, with any blockquote markers stripped. */
function unquote(line: string): string {
  return line.replace(QUOTE_MARKERS, '')
}

/**
 * Mark every newline that continues the same block of text as an explicit
 * markdown hard break: two trailing spaces before the newline.
 *
 * Code is never touched — a break inside it would end up in the code the user
 * submits — so lines are skipped while inside a fenced block, and while inside
 * an indented block, which a blockquote or list item can nest. Prose lines are
 * skipped too whenever the next line does not continue them: the last line of
 * the block, and lines followed by a blank line or by the start of a new block
 * such as the next list item.
 */
function markHardBreaks(raw: string): string {
  const lines = raw.split('\n')
  let isInFence = false
  let isInIndentedCode = false
  let isAfterBlank = false
  // Where the enclosing list item's content starts, which is what an indented
  // code block inside it is indented against. Zero outside a list.
  let contentIndent = 0

  return lines
    .map((line, index) => {
      if (FENCE.test(line)) {
        isInFence = !isInFence
        isAfterBlank = false
        return line
      }

      if (isInFence) return line

      if (BLANK.test(line)) {
        isAfterBlank = true
        return line
      }

      // An indented code block opens after a blank line, four columns past the
      // content around it, and runs until the indentation drops back out of it.
      const content = unquote(line)
      const [indent = ''] = /^[\t ]*/.exec(content) ?? []
      isInIndentedCode = widthOf(indent) >= contentIndent + INDENTED_CODE && (isInIndentedCode || isAfterBlank)
      isAfterBlank = false
      if (isInIndentedCode) return line

      const [marker] = LIST_MARKER.exec(content) ?? []
      if (marker !== undefined) contentIndent = widthOf(marker)

      const next = lines[index + 1]
      if (next === undefined || BLANK.test(next) || NEW_BLOCK.test(next) || HARD_BREAK_END.test(line)) {
        return line
      }

      return `${line}  `
    })
    .join('\n')
}

/**
 * Rewrite the single newlines inside blocks of text as explicit markdown hard
 * breaks. Unlike marked's `breaks` option the break lives in the source text,
 * so it survives whichever marked copy marklassian happens to resolve.
 *
 * marklassian converts Markdown by calling `marked.lexer` with marked's default
 * options, where a single newline is a *soft* break that collapses into the
 * surrounding paragraph. CLI users pass `\n`-separated bodies expecting each
 * line on its own line, so mark those newlines as hard breaks in the source
 * itself — marked then emits a `br` token, which marklassian renders as a
 * `hardBreak` node.
 *
 * We lex first so only paragraphs, blockquotes and list items are touched: code
 * blocks, tables and headings keep their raw text, and blank-line paragraph
 * separation is preserved.
 */
function withExplicitHardBreaks(markdown: string): string {
  return lexer(markdown)
    .map((token) => (TEXT_BLOCKS.has(token.type) ? markHardBreaks(token.raw) : token.raw))
    .join('')
}

/**
 * Convert a Markdown string into a Jira ADF document.
 *
 * Literal `\n` sequences (as typed inside a single shell argument) are unescaped
 * to real newlines, and single newlines produce hard line breaks rather than
 * collapsing into one run-on paragraph.
 */
export function markdownToAdfDocument(markdown: string): Document {
  return markdownToAdf(withExplicitHardBreaks(markdown.replaceAll(String.raw`\n`, '\n')))
}
