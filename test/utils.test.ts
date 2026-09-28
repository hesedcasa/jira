import type {Issue} from 'jira.js/cloud'

import {expect} from 'chai'

import {defaultFields, duplicateFieldsError, parseKeyValuePairs, processIssueRenderedAndFields} from '../src/utils.js'

describe('utils', () => {
  describe('defaultFields', () => {
    it('contains expected default fields', () => {
      expect(defaultFields).to.be.an('array')
      expect(defaultFields).to.include('summary')
      expect(defaultFields).to.include('description')
      expect(defaultFields).to.include('status')
      expect(defaultFields).to.include('assignee')
      expect(defaultFields).to.include('reporter')
      expect(defaultFields).to.include('labels')
      expect(defaultFields).to.include('priority')
      expect(defaultFields).to.include('issuetype')
    })
  })

  describe('processIssueRenderedAndFields', () => {
    it('merges renderedFields into fields', () => {
      const issue = {
        fields: {},
        renderedFields: {
          description: '<p>Test description</p>',
          summary: 'Test summary',
        },
      } as Issue

      processIssueRenderedAndFields(issue)

      expect(issue.fields).to.have.property('description')
      expect(issue.fields).to.have.property('summary')
    })

    it('converts HTML description to markdown', () => {
      const issue = {
        fields: {},
        renderedFields: {
          description: '<p>Test description</p>',
        },
      } as Issue

      processIssueRenderedAndFields(issue)

      expect(issue.fields?.description).to.be.a('string')
      // Should convert <p> tags to markdown format
      expect(String(issue.fields?.description)).to.include('Test description')
    })

    it('preserves punctuation in code block languages', () => {
      const issue = {
        fields: {},
        renderedFields: {
          description:
            '<pre class="code-c++">vector&lt;int&gt;</pre><pre class="code-objective-c">@interface Foo</pre>',
        },
      } as Issue

      processIssueRenderedAndFields(issue)

      expect(issue.fields?.description).to.equal('```c++\nvector<int>\n```\n\n```objective-c\n@interface Foo\n```')
    })

    it('filters empty custom fields from renderedFields', () => {
      const issue = {
        fields: {},
        renderedFields: {
          customfield_10000: '',
          customfield_10001: null,
          description: '<p>Test</p>',
        },
      } as Issue
      processIssueRenderedAndFields(issue)

      expect(issue.fields).to.have.property('description')
      // Empty custom fields should be filtered out
      expect(issue.renderedFields).to.be.empty
    })

    it('filters empty custom fields from fields', () => {
      const issue = {
        fields: {
          customfield_10000: '',
          customfield_10001: null,
          summary: 'Test summary',
        },
        renderedFields: {},
      } as unknown as Issue

      processIssueRenderedAndFields(issue)

      expect(issue.fields).to.have.property('summary')
      expect(issue.fields).not.to.have.property('customfield_10000')
    })

    it('keeps non-empty custom fields', () => {
      const issue = {
        fields: {
          customfield_10000: 'value',
          summary: 'Test summary',
        },
        renderedFields: {},
      } as unknown as Issue

      processIssueRenderedAndFields(issue)

      expect(issue.fields).to.have.property('customfield_10000', 'value')
      expect(issue.fields).to.have.property('summary', 'Test summary')
    })

    it('processes comments in renderedFields', () => {
      const issue = {
        fields: {},
        renderedFields: {
          comment: {
            comments: [{body: '<p>Comment 1</p>'}, {body: '<p>Comment 2</p>'}],
          },
        },
      } as Issue

      processIssueRenderedAndFields(issue)

      expect(issue.fields).to.have.property('comment')
      const commentObj = issue.fields?.comment as {comments: Array<{body?: string}>}
      expect(commentObj.comments).to.be.an('array')
      expect(commentObj.comments).to.have.lengthOf(2)
    })

    it('converts HTML in comments to markdown', () => {
      const issue = {
        fields: {},
        renderedFields: {
          comment: {
            comments: [{body: '<p>Test comment with <strong>bold</strong> text</p>'}],
          },
        },
      } as Issue

      processIssueRenderedAndFields(issue)

      const commentObj = issue.fields?.comment as {comments: Array<{body?: string}>}
      expect(commentObj.comments[0].body).to.be.a('string')
      expect(String(commentObj.comments[0].body)).to.include('Test comment')
    })

    it('handles issue without renderedFields', () => {
      const issue = {
        fields: {summary: 'Test'},
      } as Issue

      processIssueRenderedAndFields(issue)

      expect(issue.fields).to.have.property('summary', 'Test')
    })

    it('handles issue with undefined fields', () => {
      const issue = {} as Issue

      processIssueRenderedAndFields(issue)

      expect(issue.fields).to.not.be.undefined
    })

    it('uses a longer fence when code contains a triple-backtick line', () => {
      const issue = {
        fields: {},
        renderedFields: {
          description: '<pre class="code-java">line one\n```\nline two</pre>',
        },
      } as Issue

      processIssueRenderedAndFields(issue)

      const trimmed = String(issue.fields?.description).trim()
      let fenceLength = 0
      while (trimmed[fenceLength] === '`') fenceLength++

      expect(fenceLength).to.be.greaterThan(3)
      const fence = '`'.repeat(fenceLength)
      // The fence must not appear anywhere inside the code content itself.
      const inner = trimmed.slice(fenceLength, -fenceLength)
      expect(inner).to.not.include(fence)
      expect(inner).to.include('line one')
      expect(inner).to.include('line two')
    })

    it('converts ADF description, comments and rich-text custom fields to markdown', () => {
      const adf = (value: string) => ({
        content: [{content: [{text: value, type: 'text'}], type: 'paragraph'}],
        type: 'doc',
        version: 1,
      })
      const issue = {
        fields: {
          comment: {
            comments: [
              {
                author: {accountId: 'acc-1', displayName: 'Jane'},
                body: adf('[minion:plan] x'),
                created: '2026-09-29T00:02:40.373+0800',
                id: '10001',
                updated: '2026-09-29T00:02:40.373+0800',
              },
            ],
            maxResults: 1,
            startAt: 0,
            total: 1,
          },
          created: '2026-09-25T16:32:00.000+0800',
          customfield_10050: adf('rich *text*'),
          description: adf('the description'),
          updated: '2026-09-29T00:02:40.373+0800',
        },
        renderedFields: {
          comment: {comments: [{body: '<p>rendered</p>', created: 'Today 12:02 AM'}]},
          created: 'Friday 4:32 PM',
          description: '<p>rendered</p>',
          updated: 'Today 12:02 AM',
        },
      } as unknown as Issue

      processIssueRenderedAndFields(issue)

      const fields = issue.fields as unknown as Record<string, unknown>
      expect(fields.description).to.equal('the description')
      expect(fields.customfield_10050).to.equal('rich *text*')
      expect(fields.created).to.equal('2026-09-25T16:32:00.000+0800')
      expect(fields.updated).to.equal('2026-09-29T00:02:40.373+0800')
      const {comments} = fields.comment as {comments: Array<Record<string, unknown>>}
      expect(comments[0]).to.deep.equal({
        author: {accountId: 'acc-1', displayName: 'Jane'},
        body: '[minion:plan] x',
        created: '2026-09-29T00:02:40.373+0800',
        id: '10001',
        updated: '2026-09-29T00:02:40.373+0800',
      })
      expect(issue.renderedFields).to.be.empty
    })

    it('links embedded media in the description to the issue attachment', () => {
      const issue = {
        fields: {
          attachment: [{content: 'https://x.test/attachment/content/10001', filename: 'shot.png', id: '10001'}],
          description: {
            content: [
              {content: [{attrs: {alt: 'shot.png', id: 'uuid', type: 'file'}, type: 'media'}], type: 'mediaSingle'},
            ],
            type: 'doc',
          },
        },
      } as unknown as Issue

      processIssueRenderedAndFields(issue)

      expect(issue.fields?.description).to.equal('[attachment: shot.png](https://x.test/attachment/content/10001)')
    })

    it('pads <tt> code that touches a backtick in the rendered-HTML fallback', () => {
      const issue = {fields: {}, renderedFields: {description: '<p><tt>`x</tt></p>'}} as Issue

      processIssueRenderedAndFields(issue)

      expect(issue.fields?.description).to.equal('`` `x ``')
    })

    it('returns an empty description string when Jira has none', () => {
      const issue = {fields: {description: null, summary: 'x'}} as unknown as Issue

      processIssueRenderedAndFields(issue)

      expect(issue.fields?.description).to.equal('')
    })

    it('keeps rendered-HTML fallback lossless for code, inline code and brackets', () => {
      const issue = {
        fields: {},
        renderedFields: {
          description:
            '<p><span class="error">&#91;minion:plan&#93;</span> x</p><ul><li><tt>code</tt> inline</li></ul>' +
            '<div class="preformatted panel"><div class="preformattedContent panelContent"><pre>const x = 1;</pre></div></div>',
        },
      } as Issue

      processIssueRenderedAndFields(issue)

      const description = String(issue.fields?.description)
      expect(description).to.include('[minion:plan] x')
      expect(description).to.include('`code` inline')
      expect(description).to.not.include(String.raw`\[`)
      expect(description).to.include('```\nconst x = 1;\n```')
    })

    it('clears renderedFields after processing', () => {
      const issue = {
        fields: {},
        renderedFields: {
          description: '<p>Test</p>',
        },
      } as Issue

      processIssueRenderedAndFields(issue)

      expect(issue.renderedFields).to.be.empty
    })
  })

  describe('parseKeyValuePairs', () => {
    it('splits on the first = only', () => {
      expect(parseKeyValuePairs(['summary=a=b', 'labels=["a"]'])).to.deep.equal({labels: '["a"]', summary: 'a=b'})
    })

    it('returns an empty map when no pairs are given', () => {
      expect(parseKeyValuePairs()).to.deep.equal({})
    })
  })

  describe('duplicateFieldsError', () => {
    it('names every key present in both maps', () => {
      expect(duplicateFieldsError({a: '1', b: '2', c: '3'}, {a: 'x', c: 'y'})).to.equal(
        'Field(s) given in both --fields and --text-fields: a, c',
      )
    })

    it('is undefined when the maps do not overlap', () => {
      expect(duplicateFieldsError({a: '1'}, {b: '2'})).to.be.undefined
    })
  })
})
