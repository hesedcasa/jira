import {TrelloClient} from 'trello.js'

export interface ApiResult {
  data?: unknown
  error?: unknown
  success: boolean
}

export interface Config {
  apiKey: string
  apiToken: string
}

export class TrelloApi {
  private client?: TrelloClient
  private config: Config

  constructor(config: Config) {
    this.config = config
  }

  // ── Actions (comments) ────────────────────────────────────────────

  async addCardComment(cardId: string, text: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const response = await client.cards.addCardComment({id: cardId, text})
      return {data: response, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  async archiveAllCardsInList(listId: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      await client.lists.archiveAllCardsInList({id: listId})
      return {data: true, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  async archiveList(listId: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const response = await client.lists.updateList({closed: true, id: listId})
      return {data: response, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  // ── Boards ────────────────────────────────────────────────────────

  clearClients(): void {
    this.client = undefined
  }

  async createBoard(name: string, desc?: string, idOrganization?: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const response = await client.boards.createBoard({
        desc,
        idOrganization,
        name,
      })
      return {data: response, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  async createCard(idList: string, name: string, desc?: string, pos?: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const response = await client.cards.createCard({
        desc,
        idList,
        name,
        pos: pos as 'bottom' | 'top' | undefined,
      })
      return {data: response, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  async createChecklist(cardId: string, name: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const response = await client.checklists.createChecklist({idCard: cardId, name})
      return {data: response, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  async createChecklistItem(checklistId: string, name: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const response = await client.checklists.createChecklistCheckItems({id: checklistId, name})
      return {data: response, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  async createLabel(boardId: string, name: string, color: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const response = await client.labels.createLabel({color, idBoard: boardId, name})
      return {data: response, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  async createList(boardId: string, name: string, pos?: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const response = await client.lists.createList({
        idBoard: boardId,
        name,
        pos: pos as 'bottom' | 'top' | undefined,
      })
      return {data: response, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  async deleteBoard(boardId: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      await client.boards.deleteBoard({id: boardId})
      return {data: true, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  // ── Cards ─────────────────────────────────────────────────────────

  async deleteCard(cardId: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      await client.cards.deleteCard({id: cardId})
      return {data: true, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  async deleteCardComment(cardId: string, actionId: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      await client.cards.deleteCardComment({id: cardId, idAction: actionId})
      return {data: true, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  async deleteChecklist(checklistId: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      await client.checklists.deleteChecklist({id: checklistId})
      return {data: true, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  async deleteChecklistItem(checklistId: string, checkItemId: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      await client.checklists.deleteChecklistCheckItem({id: checklistId, idCheckItem: checkItemId})
      return {data: true, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  async deleteLabel(labelId: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      await client.labels.deleteLabel({id: labelId})
      return {data: true, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  async getBoard(boardId: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const response = await client.boards.getBoard({id: boardId})
      return {data: response, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  async getBoardCards(boardId: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const response = await client.boards.getBoardCards({id: boardId})
      return {data: response, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  async getBoardLabels(boardId: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const response = await client.boards.getBoardLabels({id: boardId})
      return {data: response, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  // ── Checklists ────────────────────────────────────────────────────

  async getBoardLists(boardId: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const response = await client.boards.getBoardLists({id: boardId})
      return {data: response, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  async getBoardMembers(boardId: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const response = await client.boards.getBoardMembers({id: boardId})
      return {data: response, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  async getCard(cardId: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const response = await client.cards.getCard({id: cardId})
      return {data: response, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  async getCardActions(cardId: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const response = await client.cards.getCardActions({id: cardId})
      return {data: response, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  async getCardChecklists(cardId: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const response = await client.cards.getCardChecklists({id: cardId})
      return {data: response, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  // ── Client ────────────────────────────────────────────────────────

  async getChecklist(checklistId: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const response = await client.checklists.getChecklist({id: checklistId})
      return {data: response, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  getClient(): TrelloClient {
    if (this.client) {
      return this.client
    }

    this.client = new TrelloClient({
      key: this.config.apiKey,
      token: this.config.apiToken,
    })

    return this.client
  }

  // ── Labels ────────────────────────────────────────────────────────

  async getLabel(labelId: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const response = await client.labels.getLabel({id: labelId})
      return {data: response, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  async getList(listId: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const response = await client.lists.getList({id: listId})
      return {data: response, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  async getListCards(listId: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const response = await client.lists.getListCards({id: listId})
      return {data: response, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  async getMember(memberId: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const response = await client.members.getMember({id: memberId})
      return {data: response, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  // ── Lists ─────────────────────────────────────────────────────────

  async getMyBoards(): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const me = await client.members.getMember({id: 'me'})
      const response = await client.members.getMemberBoards({id: me.id ?? 'me'})
      return {data: response, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  async moveCard(cardId: string, idList: string, idBoard?: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const response = await client.cards.updateCard({
        id: cardId,
        idBoard,
        idList,
      })
      return {data: response, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  async searchCards(query: string, boardIds?: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const response = await client.search.getSearch({
        idBoards: boardIds ? boardIds.split(',') : undefined,
        modelTypes: 'cards',
        query,
      })
      return {data: response, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  async testConnection(): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const me = await client.members.getMember({id: 'me'})
      return {data: me, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  async updateCard(cardId: string, fields: Record<string, unknown>): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const response = await client.cards.updateCard({
        id: cardId,
        ...fields,
      })
      return {data: response, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  // ── Members ───────────────────────────────────────────────────────

  async updateCardComment(cardId: string, actionId: string, text: string): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const response = await client.cards.updateCardComment({id: cardId, idAction: actionId, text})
      return {data: response, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  // ── Test connection ───────────────────────────────────────────────

  async updateLabel(labelId: string, fields: Record<string, unknown>): Promise<ApiResult> {
    try {
      const client = this.getClient()
      const response = await client.labels.updateLabel({id: labelId, ...fields})
      return {data: response, success: true}
    } catch (error: unknown) {
      return this.handleError(error)
    }
  }

  // ── Private helpers ───────────────────────────────────────────────

  private handleError(error: unknown): ApiResult {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {error: errorMessage, success: false}
  }
}
