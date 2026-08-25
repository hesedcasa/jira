import {expect} from 'chai'

import {markdownToAdfDocument} from '../src/markdown.js'

// Minimal shape of the ADF nodes we assert on. marklassian does not export its
// node types, so we model only what these tests need.
type AdfNode = {
  content?: AdfNode[]
  text?: string
  type: string
}

/** True if any node in the tree is a hardBreak. */
function hasHardBreak(node?: AdfNode[]): boolean {
  return (node ?? []).some((n) => n.type === 'hardBreak' || (n.content && hasHardBreak(n.content)))
}

describe('markdownToAdfDocument', () => {
  it('converts single newlines into hardBreak nodes (not a collapsed paragraph)', () => {
    const adf = markdownToAdfDocument('**A:** 1\n**B:** 2\n**C:** 3') as {content?: AdfNode[]}

    // The three bold lines must stay on separate lines, i.e. the paragraph
    // must contain hardBreak nodes. Without the fix they collapse into one run.
    expect(hasHardBreak(adf.content?.[0]?.content)).to.equal(true)
  })

  it('keeps the five bold fields on separate lines (the reported regression)', () => {
    const body = '**Field1:** a\n**Field2:** b\n**Field3:** c\n**Field4:** d\n**Field5:** e'
    const adf = markdownToAdfDocument(body) as {content?: AdfNode[]}

    expect(hasHardBreak(adf.content?.[0]?.content)).to.equal(true)
  })

  it('unescapes literal backslash-n sequences into real line breaks', () => {
    // How a shell user typically passes multi-line bodies: a single arg with \n.
    const adf = markdownToAdfDocument(String.raw`**A:** 1\n**B:** 2`) as {content?: AdfNode[]}

    expect(hasHardBreak(adf.content?.[0]?.content)).to.equal(true)
  })

  it('still separates paragraphs on blank lines', () => {
    const adf = markdownToAdfDocument('para one\n\npara two') as {content?: AdfNode[]}

    expect(adf.content?.length).to.equal(2)
    expect(adf.content?.[0].type).to.equal('paragraph')
    expect(adf.content?.[1].type).to.equal('paragraph')
  })

  it('leaves fenced code block newlines intact (no hardBreak injected)', () => {
    const adf = markdownToAdfDocument('```\nline one\nline two\n```') as {content?: AdfNode[]}
    const code = adf.content?.[0]

    expect(code?.type).to.equal('codeBlock')
    expect(code?.content?.[0]?.text).to.equal('line one\nline two')
    expect(hasHardBreak(adf.content)).to.equal(false)
  })

  it('leaves list items intact (no hardBreak injected between items)', () => {
    const adf = markdownToAdfDocument('- item one\n- item two\n- item three') as {content?: AdfNode[]}

    expect(adf.content?.[0].type).to.equal('bulletList')
    expect(hasHardBreak(adf.content)).to.equal(false)
  })

  it('breaks continuation lines inside a blockquote', () => {
    const adf = markdownToAdfDocument('> first line\n> second line') as {content?: AdfNode[]}

    expect(adf.content?.[0].type).to.equal('blockquote')
    expect(hasHardBreak(adf.content)).to.equal(true)
  })

  it('breaks continuation lines inside a list item, without touching item boundaries', () => {
    const adf = markdownToAdfDocument('- one a\n  one b\n- two a\n  two b') as {content?: AdfNode[]}
    const items = adf.content?.[0]?.content

    expect(adf.content?.[0].type).to.equal('bulletList')
    expect(items?.length).to.equal(2)
    expect(hasHardBreak(items?.[0]?.content)).to.equal(true)
    expect(hasHardBreak(items?.[1]?.content)).to.equal(true)
  })

  it('leaves list item text untouched when the next line starts a new item', () => {
    const adf = markdownToAdfDocument('- item one\n- item two') as {content?: AdfNode[]}
    const texts = (adf.content?.[0]?.content ?? []).map((item) => item.content?.[0]?.content?.[0]?.text)

    expect(texts).to.deep.equal(['item one', 'item two'])
  })

  it('leaves a fenced code block nested in a list item intact', () => {
    const adf = markdownToAdfDocument('- item\n\n  ```\n  code a\n  code b\n  ```') as {content?: AdfNode[]}
    const code = adf.content?.[0]?.content?.[0]?.content?.[1]

    expect(code?.type).to.equal('codeBlock')
    expect(code?.content?.[0]?.text).to.equal('code a\ncode b')
    expect(hasHardBreak(adf.content)).to.equal(false)
  })

  it('leaves an indented code block nested in a list item intact', () => {
    const adf = markdownToAdfDocument('- item\n\n      code a\n      code b') as {content?: AdfNode[]}
    const code = adf.content?.[0]?.content?.[0]?.content?.[1]

    expect(code?.type).to.equal('codeBlock')
    expect(code?.content?.[0]?.text).to.equal('code a\ncode b')
  })

  it('leaves an indented code block nested in a blockquote intact', () => {
    const adf = markdownToAdfDocument('> intro\n>\n>     code a\n>     code b') as {content?: AdfNode[]}
    const code = adf.content?.[0]?.content?.[1]

    expect(code?.type).to.equal('codeBlock')
    expect(code?.content?.[0]?.text).to.equal('code a\ncode b')
  })

  it('resumes breaking lines after a nested indented code block', () => {
    const body = '- item\n\n      code a\n      code b\n\n  tail one\n  tail two'
    const adf = markdownToAdfDocument(body) as {content?: AdfNode[]}
    const item = adf.content?.[0]?.content?.[0]?.content

    expect(item?.[1]?.content?.[0]?.text).to.equal('code a\ncode b')
    expect(hasHardBreak(item?.[2]?.content)).to.equal(true)
  })

  it('keeps paragraphs and code blocks intact in a mixed body', () => {
    const adf = markdownToAdfDocument('intro one\nintro two\n\n```\ncode a\ncode b\n```\n\ntail one\ntail two') as {
      content?: AdfNode[]
    }

    expect(adf.content?.map((n) => n.type)).to.deep.equal(['paragraph', 'codeBlock', 'paragraph'])
    expect(hasHardBreak(adf.content?.[0]?.content)).to.equal(true)
    expect(hasHardBreak(adf.content?.[1]?.content)).to.equal(false)
    expect(adf.content?.[1]?.content?.[0]?.text).to.equal('code a\ncode b')
    expect(hasHardBreak(adf.content?.[2]?.content)).to.equal(true)
  })
})
