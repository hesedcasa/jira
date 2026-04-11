/* eslint-disable @typescript-eslint/no-explicit-any */
import {expect} from 'chai'
import esmock from 'esmock'

describe('trello-client', () => {
  let trelloClient: any
  let mockTrelloApi: any
  let mockTrelloApiInstance: any

  const mockConfig = {
    apiKey: 'test-key',
    apiToken: 'test-token',
  }

  beforeEach(async () => {
    mockTrelloApiInstance = {
      addCardComment: async () => ({data: {id: '10001'}, success: true}),
      archiveAllCardsInList: async () => ({data: true, success: true}),
      archiveList: async () => ({data: {id: 'list1'}, success: true}),
      clearClients() {},
      createBoard: async () => ({data: {id: 'board1', name: 'Test Board'}, success: true}),
      createCard: async () => ({data: {id: 'card1', name: 'Test Card'}, success: true}),
      createChecklist: async () => ({data: {id: 'cl1'}, success: true}),
      createChecklistItem: async () => ({data: {id: 'ci1'}, success: true}),
      createLabel: async () => ({data: {id: 'label1'}, success: true}),
      createList: async () => ({data: {id: 'list1', name: 'Test List'}, success: true}),
      deleteBoard: async () => ({data: true, success: true}),
      deleteCard: async () => ({data: true, success: true}),
      deleteCardComment: async () => ({data: true, success: true}),
      deleteChecklist: async () => ({data: true, success: true}),
      deleteChecklistItem: async () => ({data: true, success: true}),
      deleteLabel: async () => ({data: true, success: true}),
      getBoard: async () => ({data: {id: 'board1', name: 'Test Board'}, success: true}),
      getBoardCards: async () => ({data: [{id: 'card1'}], success: true}),
      getBoardLabels: async () => ({data: [{id: 'label1'}], success: true}),
      getBoardLists: async () => ({data: [{id: 'list1'}], success: true}),
      getBoardMembers: async () => ({data: [{id: 'member1'}], success: true}),
      getCard: async () => ({data: {id: 'card1', name: 'Test Card'}, success: true}),
      getCardActions: async () => ({data: [], success: true}),
      getCardChecklists: async () => ({data: [], success: true}),
      getChecklist: async () => ({data: {id: 'cl1'}, success: true}),
      getLabel: async () => ({data: {id: 'label1'}, success: true}),
      getList: async () => ({data: {id: 'list1', name: 'Test List'}, success: true}),
      getListCards: async () => ({data: [{id: 'card1'}], success: true}),
      getMember: async () => ({data: {fullName: 'Test User', id: 'member1'}, success: true}),
      getMyBoards: async () => ({data: [{id: 'board1'}], success: true}),
      moveCard: async () => ({data: {id: 'card1'}, success: true}),
      searchCards: async () => ({data: {cards: []}, success: true}),
      testConnection: async () => ({data: {fullName: 'Test User', id: 'me'}, success: true}),
      updateCard: async () => ({data: {id: 'card1'}, success: true}),
      updateCardComment: async () => ({data: {id: '10001'}, success: true}),
      updateLabel: async () => ({data: {id: 'label1'}, success: true}),
    }

    mockTrelloApi = class {
      constructor() {
        Object.assign(this, mockTrelloApiInstance)
      }
    }

    trelloClient = await esmock('../../src/trello/trello-client.js', {
      '../../src/trello/trello-api.js': {TrelloApi: mockTrelloApi},
    })
  })

  afterEach(() => {
    trelloClient.clearClients()
  })

  describe('getBoard', () => {
    it('returns board details', async () => {
      const result = await trelloClient.getBoard(mockConfig, 'board1')
      expect(result.success).to.be.true
      expect(result.data).to.have.property('id', 'board1')
    })

    it('handles errors', async () => {
      mockTrelloApiInstance.getBoard = async () => ({error: 'Board not found', success: false})
      trelloClient = await esmock('../../src/trello/trello-client.js', {
        '../../src/trello/trello-api.js': {TrelloApi: mockTrelloApi},
      })

      const result = await trelloClient.getBoard(mockConfig, 'invalid')
      expect(result.success).to.be.false
    })
  })

  describe('getMyBoards', () => {
    it('returns list of boards', async () => {
      const result = await trelloClient.getMyBoards(mockConfig)
      expect(result.success).to.be.true
      expect(result.data).to.be.an('array')
    })
  })

  describe('createBoard', () => {
    it('creates a board', async () => {
      const result = await trelloClient.createBoard(mockConfig, 'New Board', 'Description')
      expect(result.success).to.be.true
      expect(result.data).to.have.property('name', 'Test Board')
    })
  })

  describe('deleteBoard', () => {
    it('deletes a board', async () => {
      const result = await trelloClient.deleteBoard(mockConfig, 'board1')
      expect(result.success).to.be.true
    })
  })

  describe('getCard', () => {
    it('returns card details', async () => {
      const result = await trelloClient.getCard(mockConfig, 'card1')
      expect(result.success).to.be.true
      expect(result.data).to.have.property('name', 'Test Card')
    })
  })

  describe('createCard', () => {
    it('creates a card', async () => {
      const result = await trelloClient.createCard(mockConfig, 'list1', 'New Card', 'Description')
      expect(result.success).to.be.true
    })
  })

  describe('updateCard', () => {
    it('updates a card', async () => {
      const result = await trelloClient.updateCard(mockConfig, 'card1', {name: 'Updated'})
      expect(result.success).to.be.true
    })
  })

  describe('deleteCard', () => {
    it('deletes a card', async () => {
      const result = await trelloClient.deleteCard(mockConfig, 'card1')
      expect(result.success).to.be.true
    })
  })

  describe('moveCard', () => {
    it('moves a card to another list', async () => {
      const result = await trelloClient.moveCard(mockConfig, 'card1', 'list2')
      expect(result.success).to.be.true
    })
  })

  describe('searchCards', () => {
    it('searches for cards', async () => {
      const result = await trelloClient.searchCards(mockConfig, 'test query')
      expect(result.success).to.be.true
    })
  })

  describe('getList', () => {
    it('returns list details', async () => {
      const result = await trelloClient.getList(mockConfig, 'list1')
      expect(result.success).to.be.true
      expect(result.data).to.have.property('name', 'Test List')
    })
  })

  describe('createList', () => {
    it('creates a list', async () => {
      const result = await trelloClient.createList(mockConfig, 'board1', 'New List')
      expect(result.success).to.be.true
    })
  })

  describe('archiveList', () => {
    it('archives a list', async () => {
      const result = await trelloClient.archiveList(mockConfig, 'list1')
      expect(result.success).to.be.true
    })
  })

  describe('archiveAllCardsInList', () => {
    it('archives all cards in a list', async () => {
      const result = await trelloClient.archiveAllCardsInList(mockConfig, 'list1')
      expect(result.success).to.be.true
    })
  })

  describe('getMember', () => {
    it('returns member details', async () => {
      const result = await trelloClient.getMember(mockConfig, 'me')
      expect(result.success).to.be.true
      expect(result.data).to.have.property('fullName', 'Test User')
    })
  })

  describe('getLabel', () => {
    it('returns label details', async () => {
      const result = await trelloClient.getLabel(mockConfig, 'label1')
      expect(result.success).to.be.true
    })
  })

  describe('createLabel', () => {
    it('creates a label', async () => {
      const result = await trelloClient.createLabel(mockConfig, 'board1', 'Bug', 'red')
      expect(result.success).to.be.true
    })
  })

  describe('deleteLabel', () => {
    it('deletes a label', async () => {
      const result = await trelloClient.deleteLabel(mockConfig, 'label1')
      expect(result.success).to.be.true
    })
  })

  describe('getChecklist', () => {
    it('returns checklist details', async () => {
      const result = await trelloClient.getChecklist(mockConfig, 'cl1')
      expect(result.success).to.be.true
    })
  })

  describe('createChecklist', () => {
    it('creates a checklist', async () => {
      const result = await trelloClient.createChecklist(mockConfig, 'card1', 'My Checklist')
      expect(result.success).to.be.true
    })
  })

  describe('deleteChecklist', () => {
    it('deletes a checklist', async () => {
      const result = await trelloClient.deleteChecklist(mockConfig, 'cl1')
      expect(result.success).to.be.true
    })
  })

  describe('createChecklistItem', () => {
    it('creates a checklist item', async () => {
      const result = await trelloClient.createChecklistItem(mockConfig, 'cl1', 'Buy groceries')
      expect(result.success).to.be.true
    })
  })

  describe('deleteChecklistItem', () => {
    it('deletes a checklist item', async () => {
      const result = await trelloClient.deleteChecklistItem(mockConfig, 'cl1', 'ci1')
      expect(result.success).to.be.true
    })
  })

  describe('addCardComment', () => {
    it('adds a comment', async () => {
      const result = await trelloClient.addCardComment(mockConfig, 'card1', 'Test comment')
      expect(result.success).to.be.true
    })
  })

  describe('updateCardComment', () => {
    it('updates a comment', async () => {
      const result = await trelloClient.updateCardComment(mockConfig, 'card1', 'action1', 'Updated')
      expect(result.success).to.be.true
    })
  })

  describe('deleteCardComment', () => {
    it('deletes a comment', async () => {
      const result = await trelloClient.deleteCardComment(mockConfig, 'card1', 'action1')
      expect(result.success).to.be.true
    })
  })

  describe('testConnection', () => {
    it('tests connection successfully', async () => {
      const result = await trelloClient.testConnection(mockConfig)
      expect(result.success).to.be.true
    })

    it('handles connection failure', async () => {
      mockTrelloApiInstance.testConnection = async () => ({error: 'Unauthorized', success: false})
      trelloClient = await esmock('../../src/trello/trello-client.js', {
        '../../src/trello/trello-api.js': {TrelloApi: mockTrelloApi},
      })

      const result = await trelloClient.testConnection(mockConfig)
      expect(result.success).to.be.false
    })
  })

  describe('clearClients', () => {
    it('exports clearClients function', () => {
      expect(trelloClient.clearClients).to.be.a('function')
    })

    it('can be called without error', () => {
      expect(() => trelloClient.clearClients()).to.not.throw()
    })
  })
})
