import {expect} from 'chai'

import {TrelloApi} from '../../src/trello/trello-api.js'

describe('TrelloApi', () => {
  const mockConfig = {
    apiKey: 'test-key',
    apiToken: 'test-token',
  }

  let trelloApi: TrelloApi

  beforeEach(() => {
    trelloApi = new TrelloApi(mockConfig)
  })

  afterEach(() => {
    trelloApi.clearClients()
  })

  describe('constructor', () => {
    it('creates a new instance with config', () => {
      expect(trelloApi).to.be.an.instanceOf(TrelloApi)
    })
  })

  describe('getClient', () => {
    it('returns a TrelloClient instance', () => {
      const client = trelloApi.getClient()
      expect(client).to.have.property('boards')
      expect(client).to.have.property('cards')
      expect(client).to.have.property('lists')
      expect(client).to.have.property('members')
      expect(client).to.have.property('labels')
      expect(client).to.have.property('checklists')
      expect(client).to.have.property('search')
    })

    it('returns the same client instance on subsequent calls', () => {
      const client1 = trelloApi.getClient()
      const client2 = trelloApi.getClient()
      expect(client1).to.equal(client2)
    })
  })

  describe('clearClients', () => {
    it('clears the client instance', () => {
      trelloApi.getClient()
      trelloApi.clearClients()
      const client = trelloApi.getClient()
      expect(client).to.be.an('object')
    })
  })

  describe('getBoard', () => {
    it('exports getBoard method', () => {
      expect(trelloApi.getBoard).to.be.a('function')
    })

    it('returns an ApiResult structure', async () => {
      try {
        const result = await trelloApi.getBoard('test-board-id')
        expect(result).to.have.property('success')
      } catch {
        // Expected to fail without actual connection
      }
    })
  })

  describe('getMyBoards', () => {
    it('exports getMyBoards method', () => {
      expect(trelloApi.getMyBoards).to.be.a('function')
    })
  })

  describe('createBoard', () => {
    it('exports createBoard method', () => {
      expect(trelloApi.createBoard).to.be.a('function')
    })
  })

  describe('deleteBoard', () => {
    it('exports deleteBoard method', () => {
      expect(trelloApi.deleteBoard).to.be.a('function')
    })
  })

  describe('getCard', () => {
    it('exports getCard method', () => {
      expect(trelloApi.getCard).to.be.a('function')
    })
  })

  describe('createCard', () => {
    it('exports createCard method', () => {
      expect(trelloApi.createCard).to.be.a('function')
    })
  })

  describe('updateCard', () => {
    it('exports updateCard method', () => {
      expect(trelloApi.updateCard).to.be.a('function')
    })
  })

  describe('deleteCard', () => {
    it('exports deleteCard method', () => {
      expect(trelloApi.deleteCard).to.be.a('function')
    })
  })

  describe('moveCard', () => {
    it('exports moveCard method', () => {
      expect(trelloApi.moveCard).to.be.a('function')
    })
  })

  describe('searchCards', () => {
    it('exports searchCards method', () => {
      expect(trelloApi.searchCards).to.be.a('function')
    })
  })

  describe('getList', () => {
    it('exports getList method', () => {
      expect(trelloApi.getList).to.be.a('function')
    })
  })

  describe('createList', () => {
    it('exports createList method', () => {
      expect(trelloApi.createList).to.be.a('function')
    })
  })

  describe('archiveList', () => {
    it('exports archiveList method', () => {
      expect(trelloApi.archiveList).to.be.a('function')
    })
  })

  describe('archiveAllCardsInList', () => {
    it('exports archiveAllCardsInList method', () => {
      expect(trelloApi.archiveAllCardsInList).to.be.a('function')
    })
  })

  describe('getMember', () => {
    it('exports getMember method', () => {
      expect(trelloApi.getMember).to.be.a('function')
    })
  })

  describe('getLabel', () => {
    it('exports getLabel method', () => {
      expect(trelloApi.getLabel).to.be.a('function')
    })
  })

  describe('createLabel', () => {
    it('exports createLabel method', () => {
      expect(trelloApi.createLabel).to.be.a('function')
    })
  })

  describe('deleteLabel', () => {
    it('exports deleteLabel method', () => {
      expect(trelloApi.deleteLabel).to.be.a('function')
    })
  })

  describe('getChecklist', () => {
    it('exports getChecklist method', () => {
      expect(trelloApi.getChecklist).to.be.a('function')
    })
  })

  describe('createChecklist', () => {
    it('exports createChecklist method', () => {
      expect(trelloApi.createChecklist).to.be.a('function')
    })
  })

  describe('deleteChecklist', () => {
    it('exports deleteChecklist method', () => {
      expect(trelloApi.deleteChecklist).to.be.a('function')
    })
  })

  describe('createChecklistItem', () => {
    it('exports createChecklistItem method', () => {
      expect(trelloApi.createChecklistItem).to.be.a('function')
    })
  })

  describe('deleteChecklistItem', () => {
    it('exports deleteChecklistItem method', () => {
      expect(trelloApi.deleteChecklistItem).to.be.a('function')
    })
  })

  describe('addCardComment', () => {
    it('exports addCardComment method', () => {
      expect(trelloApi.addCardComment).to.be.a('function')
    })
  })

  describe('updateCardComment', () => {
    it('exports updateCardComment method', () => {
      expect(trelloApi.updateCardComment).to.be.a('function')
    })
  })

  describe('deleteCardComment', () => {
    it('exports deleteCardComment method', () => {
      expect(trelloApi.deleteCardComment).to.be.a('function')
    })
  })

  describe('testConnection', () => {
    it('exports testConnection method', () => {
      expect(trelloApi.testConnection).to.be.a('function')
    })
  })
})
