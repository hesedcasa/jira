import {type Document} from 'jira.js/version3/models/document'
import {setOptions} from 'marked'
import {markdownToAdf} from 'marklassian'

// marklassian converts Markdown to ADF by calling `marked.lexer` with marked's
// default options, where a single newline is a *soft* break that collapses into
// the surrounding paragraph. CLI users pass `\n`-separated bodies expecting each
// line on its own line, so enable `breaks` — marked then emits a `br` token for
// single newlines, which marklassian renders as a `hardBreak` node. marked's own
// grammar still protects block constructs (code blocks, tables, lists), so those
// are never corrupted. setOptions mutates a global default, so we apply it once.
let isBreaksEnabled = false

/**
 * Convert a Markdown string into a Jira ADF document.
 *
 * Literal `\n` sequences (as typed inside a single shell argument) are unescaped
 * to real newlines, and single newlines produce hard line breaks rather than
 * collapsing into one run-on paragraph.
 */
export function markdownToAdfDocument(markdown: string): Document {
  if (!isBreaksEnabled) {
    setOptions({breaks: true})
    isBreaksEnabled = true
  }

  return markdownToAdf(markdown.replaceAll(String.raw`\n`, '\n'))
}
