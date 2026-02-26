import type {Issue} from 'jira.js/version3/models/issue'

import {expect} from 'chai'

import {defaultFields, processIssueRenderedAndFields} from '../src/utils.js'

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

    it('filters empty custom fields from renderedFields', () => {
      const issue = {
        fields: {},
        renderedFields: {
          /* eslint-disable camelcase */
          customfield_10000: '',
          customfield_10001: null,
          /* eslint-enable camelcase */
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
          /* eslint-disable camelcase */
          customfield_10000: '',
          customfield_10001: null,
          /* eslint-enable camelcase */
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
          /* eslint-disable camelcase */
          customfield_10000: 'value',
          /* eslint-enable camelcase */
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
})
