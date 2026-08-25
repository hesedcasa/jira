import {expect} from 'chai'
import {type Document} from 'jira.js/cloud'

import {markdownToAdfDocument} from '../src/markdown.js'

// Minimal shape of the ADF nodes we assert on. marklassian does not export its
// node types, so we model only what these tests need.
type AdfNode = {
  content?: AdfNode[]
  text?: string
  type: string
}

/**
 * The converted document, narrowed to the node shape above. jira.js types a document's
 * content as `Record<string, any>[]`, which an index signature alone cannot satisfy
 * `AdfNode` with, so the narrowing goes through `unknown`.
 */
function asAdf(document: Document): {content?: AdfNode[]} {
  return document as unknown as {content?: AdfNode[]}
}

/** True if any node in the tree is a hardBreak. */
function hasHardBreak(node?: AdfNode[]): boolean {
  return (node ?? []).some((n) => n.type === 'hardBreak' || (n.content && hasHardBreak(n.content)))
}

describe('markdownToAdfDocument', () => {
  it('converts single newlines into hardBreak nodes (not a collapsed paragraph)', () => {
    const adf = asAdf(markdownToAdfDocument('**A:** 1\n**B:** 2\n**C:** 3'))

    // The three bold lines must stay on separate lines, i.e. the paragraph
    // must contain hardBreak nodes. Without the fix they collapse into one run.
    expect(hasHardBreak(adf.content?.[0]?.content)).to.equal(true)
  })

  it('keeps the five bold fields on separate lines (the reported regression)', () => {
    const body = '**Field1:** a\n**Field2:** b\n**Field3:** c\n**Field4:** d\n**Field5:** e'
    const adf = asAdf(markdownToAdfDocument(body))

    expect(hasHardBreak(adf.content?.[0]?.content)).to.equal(true)
  })

  it('unescapes literal backslash-n sequences into real line breaks', () => {
    // How a shell user typically passes multi-line bodies: a single arg with \n.
    const adf = asAdf(markdownToAdfDocument(String.raw`**A:** 1\n**B:** 2`))

    expect(hasHardBreak(adf.content?.[0]?.content)).to.equal(true)
  })

  it('still separates paragraphs on blank lines', () => {
    const adf = asAdf(markdownToAdfDocument('para one\n\npara two'))

    expect(adf.content?.length).to.equal(2)
    expect(adf.content?.[0].type).to.equal('paragraph')
    expect(adf.content?.[1].type).to.equal('paragraph')
  })

  it('leaves fenced code block newlines intact (no hardBreak injected)', () => {
    const adf = asAdf(markdownToAdfDocument('```\nline one\nline two\n```'))
    const code = adf.content?.[0]

    expect(code?.type).to.equal('codeBlock')
    expect(code?.content?.[0]?.text).to.equal('line one\nline two')
    expect(hasHardBreak(adf.content)).to.equal(false)
  })

  it('leaves list items intact (no hardBreak injected between items)', () => {
    const adf = asAdf(markdownToAdfDocument('- item one\n- item two\n- item three'))

    expect(adf.content?.[0].type).to.equal('bulletList')
    expect(hasHardBreak(adf.content)).to.equal(false)
  })

  it('breaks continuation lines inside a blockquote', () => {
    const adf = asAdf(markdownToAdfDocument('> first line\n> second line'))

    expect(adf.content?.[0].type).to.equal('blockquote')
    expect(hasHardBreak(adf.content)).to.equal(true)
  })

  it('breaks continuation lines inside a list item, without touching item boundaries', () => {
    const adf = asAdf(markdownToAdfDocument('- one a\n  one b\n- two a\n  two b'))
    const items = adf.content?.[0]?.content

    expect(adf.content?.[0].type).to.equal('bulletList')
    expect(items?.length).to.equal(2)
    expect(hasHardBreak(items?.[0]?.content)).to.equal(true)
    expect(hasHardBreak(items?.[1]?.content)).to.equal(true)
  })

  it('leaves list item text untouched when the next line starts a new item', () => {
    const adf = asAdf(markdownToAdfDocument('- item one\n- item two'))
    const texts = (adf.content?.[0]?.content ?? []).map((item) => item.content?.[0]?.content?.[0]?.text)

    expect(texts).to.deep.equal(['item one', 'item two'])
  })

  it('leaves a fenced code block nested in a list item intact', () => {
    const adf = asAdf(markdownToAdfDocument('- item\n\n  ```\n  code a\n  code b\n  ```'))
    const code = adf.content?.[0]?.content?.[0]?.content?.[1]

    expect(code?.type).to.equal('codeBlock')
    expect(code?.content?.[0]?.text).to.equal('code a\ncode b')
    expect(hasHardBreak(adf.content)).to.equal(false)
  })

  it('leaves an indented code block nested in a list item intact', () => {
    const adf = asAdf(markdownToAdfDocument('- item\n\n      code a\n      code b'))
    const code = adf.content?.[0]?.content?.[0]?.content?.[1]

    expect(code?.type).to.equal('codeBlock')
    expect(code?.content?.[0]?.text).to.equal('code a\ncode b')
  })

  it('leaves an indented code block nested in a blockquote intact', () => {
    const adf = asAdf(markdownToAdfDocument('> intro\n>\n>     code a\n>     code b'))
    const code = adf.content?.[0]?.content?.[1]

    expect(code?.type).to.equal('codeBlock')
    expect(code?.content?.[0]?.text).to.equal('code a\ncode b')
  })

  it('resumes breaking lines after a nested indented code block', () => {
    const body = '- item\n\n      code a\n      code b\n\n  tail one\n  tail two'
    const adf = asAdf(markdownToAdfDocument(body))
    const item = adf.content?.[0]?.content?.[0]?.content

    expect(item?.[1]?.content?.[0]?.text).to.equal('code a\ncode b')
    expect(hasHardBreak(item?.[2]?.content)).to.equal(true)
  })

  it('breaks indented prose in a list item that is not deep enough to be code', () => {
    const adf = asAdf(markdownToAdfDocument('- item\n\n    prose line one\n    prose line two'))

    expect(adf.content?.[0].type).to.equal('bulletList')
    expect(hasHardBreak(adf.content)).to.equal(true)
  })

  it('measures code indentation against the enclosing list item, not the document', () => {
    // Four columns past `1. ` content indent is code; three is still prose.
    const code = asAdf(markdownToAdfDocument('1. item\n\n       code a\n       code b'))
    const prose = asAdf(markdownToAdfDocument('1. item\n\n   prose one\n   prose two'))

    expect(code.content?.[0]?.content?.[0]?.content?.[1]?.content?.[0]?.text).to.equal('code a\ncode b')
    expect(hasHardBreak(prose.content)).to.equal(true)
  })

  it('keeps paragraphs and code blocks intact in a mixed body', () => {
    const adf = asAdf(markdownToAdfDocument('intro one\nintro two\n\n```\ncode a\ncode b\n```\n\ntail one\ntail two'))

    expect(adf.content?.map((n) => n.type)).to.deep.equal(['paragraph', 'codeBlock', 'paragraph'])
    expect(hasHardBreak(adf.content?.[0]?.content)).to.equal(true)
    expect(hasHardBreak(adf.content?.[1]?.content)).to.equal(false)
    expect(adf.content?.[1]?.content?.[0]?.text).to.equal('code a\ncode b')
    expect(hasHardBreak(adf.content?.[2]?.content)).to.equal(true)
  })
})
