import {type Document} from 'jira.js/version3/models/document'
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

/**
 * Starts a new block — list item, heading, fence, table row, setext underline or
 * thematic break. The newline before it is markdown syntax, not a line break.
 */
const NEW_BLOCK = /^[\s>]*(?:[*+-]\s|\d+[).]\s|#{1,6}\s|```|~~~|\||={2,}\s*$|-{3,}\s*$)/

/**
 * Mark every newline that continues the same block of text as an explicit
 * markdown hard break: two trailing spaces before the newline.
 *
 * Lines inside a fenced code block are left untouched, as is any line the next
 * line does not continue: the last line of the block, and lines followed by a
 * blank line or by the start of a new block such as the next list item.
 */
function markHardBreaks(raw: string): string {
  const lines = raw.split('\n')
  let isInFence = false

  return lines
    .map((line, index) => {
      if (FENCE.test(line)) {
        isInFence = !isInFence
        return line
      }

      const next = lines[index + 1]
      if (
        isInFence ||
        next === undefined ||
        BLANK.test(next) ||
        NEW_BLOCK.test(next) ||
        HARD_BREAK_END.test(line) ||
        BLANK.test(line)
      ) {
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
