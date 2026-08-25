import {type Document} from 'jira.js/version3/models/document'
import {lexer} from 'marked'
import {markdownToAdf} from 'marklassian'

/**
 * Rewrite the single newlines inside top-level paragraphs as explicit hard
 * breaks — two trailing spaces before the newline. Unlike marked's `breaks`
 * option the break lives in the source text, so it survives whichever marked
 * copy marklassian happens to resolve.
 *
 * marklassian converts Markdown by calling `marked.lexer` with marked's default
 * options, where a single newline is a *soft* break that collapses into the
 * surrounding paragraph. CLI users pass `\n`-separated bodies expecting each
 * line on its own line, so mark those newlines as hard breaks in the source
 * itself — marked then emits a `br` token, which marklassian renders as a
 * `hardBreak` node.
 *
 * We lex first so only paragraph tokens are touched: code blocks, lists and
 * tables keep their raw text, and blank-line paragraph separation is preserved.
 */
function withExplicitHardBreaks(markdown: string): string {
  return lexer(markdown)
    .map((token) => (token.type === 'paragraph' ? token.raw.replaceAll(/\n(?=[^\n])/g, '  \n') : token.raw))
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
