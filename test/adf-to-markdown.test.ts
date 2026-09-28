/* eslint-disable unicorn/max-nested-calls -- ADF fixtures are nested node builders */
import {expect} from 'chai'

import {type AdfNode, adfToMarkdown, isAdfDocument} from '../src/adf-to-markdown.js'
import {markdownToAdfDocument} from '../src/markdown.js'

const doc = (...content: AdfNode[]): AdfNode => ({content, type: 'doc'})
const text = (value: string, ...marks: AdfNode['marks'] & object): AdfNode => ({marks, text: value, type: 'text'})
const paragraph = (...content: AdfNode[]): AdfNode => ({content, type: 'paragraph'})

/** Markdown → ADF (the write path) → Markdown. */
const roundTrip = (markdown: string): string => adfToMarkdown(markdownToAdfDocument(markdown) as unknown as AdfNode)

describe('adfToMarkdown', () => {
  it('converts the stored comment exactly, with fences, backticks and verbatim brackets', () => {
    const adf = doc(
      paragraph(text('[minion:plan] x')),
      {
        content: [
          {
            content: [
              paragraph(
                text('code', {type: 'code'}),
                text(' inline, see '),
                text('link', {attrs: {href: 'https://example.com'}, type: 'link'}),
              ),
            ],
            type: 'listItem',
          },
        ],
        type: 'bulletList',
      },
      {attrs: {language: 'ts'}, content: [text('const x = 1;')], type: 'codeBlock'},
    )

    expect(adfToMarkdown(adf)).to.equal(
      '[minion:plan] x\n\n- `code` inline, see [link](https://example.com)\n\n```ts\nconst x = 1;\n```',
    )
  })

  it('does not backslash-escape markdown characters', () => {
    expect(adfToMarkdown(doc(paragraph(text('a_b *c* #d [e] 1. f'))))).to.equal('a_b *c* #d [e] 1. f')
  })

  it('uses longer fences when code contains backticks', () => {
    expect(adfToMarkdown(doc(paragraph(text('a`b', {type: 'code'}))))).to.equal('``a`b``')
    expect(adfToMarkdown(doc(paragraph(text('`x', {type: 'code'}))))).to.equal('`` `x ``')
    expect(adfToMarkdown(doc({content: [text('before\n```\nafter')], type: 'codeBlock'}))).to.equal(
      '````\nbefore\n```\nafter\n````',
    )
  })

  it('renders marks across node boundaries without splitting delimiters', () => {
    const strong = {type: 'strong'}
    const adf = doc(
      paragraph(
        text('bold ', strong),
        text('link', strong, {attrs: {href: 'https://x.test'}, type: 'link'}),
        text(' end', strong),
        text(' plain '),
        text('it', {type: 'em'}),
        text(' '),
        text('gone', {type: 'strike'}),
        text(' u', {type: 'underline'}),
      ),
    )
    expect(adfToMarkdown(adf)).to.equal('**bold [link](https://x.test) end** plain *it* ~~gone~~ u')
  })

  it('renders headings, rules, blockquotes, panels and hard breaks', () => {
    const adf = doc(
      {attrs: {level: 3}, content: [text('Title')], type: 'heading'},
      {type: 'rule'},
      {content: [paragraph(text('one'), {type: 'hardBreak'}, text('two'))], type: 'blockquote'},
      {attrs: {panelType: 'info'}, content: [paragraph(text('note'))], type: 'panel'},
    )
    expect(adfToMarkdown(adf)).to.equal('### Title\n\n---\n\n> one\n> two\n\n> note')
  })

  it('renders ordered lists from attrs.order with nested lists indented', () => {
    const item = (...content: AdfNode[]): AdfNode => ({content, type: 'listItem'})
    const adf = doc({
      attrs: {order: 3},
      content: [
        item(paragraph(text('three')), {content: [item(paragraph(text('nested')))], type: 'bulletList'}),
        item(paragraph(text('four'))),
      ],
      type: 'orderedList',
    })
    expect(adfToMarkdown(adf)).to.equal('3. three\n   - nested\n4. four')
  })

  it('renders tables with a header row', () => {
    const cell = (type: string, value: string): AdfNode => ({content: [paragraph(text(value))], type})
    const adf = doc({
      content: [
        {content: [cell('tableHeader', 'A'), cell('tableHeader', 'B')], type: 'tableRow'},
        {content: [cell('tableCell', '1|2'), cell('tableCell', '3')], type: 'tableRow'},
      ],
      type: 'table',
    })
    expect(adfToMarkdown(adf)).to.equal(String.raw`| A | B |
| --- | --- |
| 1\|2 | 3 |`)
  })

  it('renders inline nodes, media, expand and unknown nodes', () => {
    const adf = doc(
      paragraph(
        {attrs: {id: 'abc', text: '@Jane Doe'}, type: 'mention'},
        text(' '),
        {attrs: {shortName: ':smile:', text: '😄'}, type: 'emoji'},
        text(' '),
        {attrs: {url: 'https://card.test'}, type: 'inlineCard'},
        text(' '),
        {attrs: {timestamp: '1759104000000'}, type: 'date'},
        text(' '),
        {attrs: {text: 'IN PROGRESS'}, type: 'status'},
      ),
      {content: [{attrs: {alt: 'shot.png', id: 'm1', type: 'file'}, type: 'media'}], type: 'mediaSingle'},
      {attrs: {title: 'More'}, content: [paragraph(text('hidden'))], type: 'expand'},
      {content: [{content: [paragraph(text('in a layout'))], type: 'layoutColumn'}], type: 'layoutSection'},
    )
    expect(adfToMarkdown(adf)).to.equal(
      '@Jane Doe 😄 https://card.test 2025-09-29 IN PROGRESS\n\n[attachment: shot.png]\n\n**More**\n\nhidden\n\nin a layout',
    )
  })

  it('pads inline code that starts and ends with a space so the write path keeps it', () => {
    const adf = doc(paragraph(text(' a ', {type: 'code'})))
    const markdown = adfToMarkdown(adf)
    expect(markdown).to.equal('`  a  `')
    expect(markdownToAdfDocument(markdown).content[0]).to.deep.include({
      content: [{marks: [{type: 'code'}], text: ' a ', type: 'text'}],
    })
  })

  it('keeps list-like text after a hard break inside its paragraph', () => {
    const adf = doc(
      paragraph(
        text('Keep this line'),
        {type: 'hardBreak'},
        text('- do not delete'),
        {type: 'hardBreak'},
        text('1. nor this'),
        {type: 'hardBreak'},
        text('# or this'),
      ),
    )
    const markdown = adfToMarkdown(adf)
    expect(markdown).to.equal(
      ['Keep this line', String.raw`\- do not delete`, String.raw`1\. nor this`, String.raw`\# or this`].join('\n'),
    )

    const written = markdownToAdfDocument(markdown)
    expect(written.content).to.have.lengthOf(1)
    expect(written.content[0].type).to.equal('paragraph')
    // marklassian splits escaped text into adjacent text nodes; the content is what matters.
    const content = (written.content[0].content ?? [])
      .map((node: {text?: string; type: string}) => (node.type === 'hardBreak' ? '\n' : (node.text ?? '')))
      .join('')
    expect(content).to.equal('Keep this line\n- do not delete\n1. nor this\n# or this')
  })

  it('wraps link destinations with spaces or nested parentheses in angle brackets', () => {
    const link = (href: string): string => adfToMarkdown(doc(paragraph(text('x', {attrs: {href}, type: 'link'}))))
    expect(link('https://x.test/wiki/Foo_(bar)')).to.equal('[x](https://x.test/wiki/Foo_(bar))')
    expect(link('https://x.test/a b')).to.equal('[x](<https://x.test/a b>)')
    expect(link('https://x.test/f(a(b))')).to.equal('[x](<https://x.test/f(a(b))>)')
    expect(link('https://x.test/a)b')).to.equal('[x](<https://x.test/a)b>)')
    expect(link('https://x.test/<a> b')).to.equal('[x](<https://x.test/%3Ca%3E b>)')
  })

  it('links embedded media to the matching attachment, and never shows a UUID as an attachment', () => {
    const media = (attrs: Record<string, unknown>): AdfNode => ({
      content: [{attrs: {collection: '', type: 'file', ...attrs}, type: 'media'}],
      type: 'mediaSingle',
    })
    const attachments = [{content: 'https://x.test/rest/api/3/attachment/content/10001', filename: 'shot.png'}]

    expect(adfToMarkdown(doc(media({alt: 'shot.png', id: 'uuid-1'})), {attachments})).to.equal(
      '[attachment: shot.png](https://x.test/rest/api/3/attachment/content/10001)',
    )
    expect(adfToMarkdown(doc(media({alt: 'other.png', id: 'uuid-2'})), {attachments})).to.equal(
      '[attachment: other.png]',
    )
    expect(adfToMarkdown(doc(media({id: 'uuid-3'})), {attachments})).to.equal('[media: uuid-3]')
    expect(adfToMarkdown(doc(media({type: 'external', url: 'https://img.test/a.png'})))).to.equal(
      '[attachment: https://img.test/a.png](https://img.test/a.png)',
    )
  })

  it('returns an empty string for missing documents', () => {
    expect(adfToMarkdown(null)).to.equal('')
    expect(adfToMarkdown(doc())).to.equal('')
  })

  it('detects ADF documents', () => {
    expect(isAdfDocument(doc())).to.equal(true)
    expect(isAdfDocument({type: 'doc'})).to.equal(false)
    expect(isAdfDocument('text')).to.equal(false)
    expect(isAdfDocument(null)).to.equal(false)
  })

  describe('round-trip through the write path', () => {
    for (const markdown of [
      '# Heading\n\n## Sub heading',
      '**bold** and *italic* and ~~gone~~',
      'use `npm test` here',
      '```ts\nconst x = 1;\n```',
      '- one\n  - nested\n- two',
      '1. first\n2. second',
      'see [docs](https://example.com)',
      '| A | B |\n| --- | --- |\n| 1 | 2 |',
      '[minion:xyz] ready',
      '> quoted',
    ]) {
      it(`preserves ${JSON.stringify(markdown)}`, () => {
        expect(roundTrip(markdown)).to.equal(markdown)
      })
    }

    it('keeps typed line breaks as newlines', () => {
      expect(roundTrip('alpha\nbravo')).to.equal('alpha\nbravo')
    })
  })
})
