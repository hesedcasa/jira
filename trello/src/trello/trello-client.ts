import type {ApiResult, Config} from './trello-api.js'

import {TrelloApi} from './trello-api.js'

let trelloApi: null | TrelloApi

async function initTrello(config: Config): Promise<TrelloApi> {
  if (trelloApi) return trelloApi

  try {
    trelloApi = new TrelloApi(config)
    return trelloApi
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to initialize Trello client: ${errorMessage}`)
  }
}

// ── Boards ──────────────────────────────────────────────────────────

export async function getBoard(config: Config, boardId: string): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.getBoard(boardId)
}

export async function getMyBoards(config: Config): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.getMyBoards()
}

export async function createBoard(
  config: Config,
  name: string,
  desc?: string,
  idOrganization?: string,
): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.createBoard(name, desc, idOrganization)
}

export async function deleteBoard(config: Config, boardId: string): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.deleteBoard(boardId)
}

export async function getBoardCards(config: Config, boardId: string): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.getBoardCards(boardId)
}

export async function getBoardLists(config: Config, boardId: string): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.getBoardLists(boardId)
}

export async function getBoardMembers(config: Config, boardId: string): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.getBoardMembers(boardId)
}

export async function getBoardLabels(config: Config, boardId: string): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.getBoardLabels(boardId)
}

// ── Cards ───────────────────────────────────────────────────────────

export async function getCard(config: Config, cardId: string): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.getCard(cardId)
}

// eslint-disable-next-line max-params
export async function createCard(
  config: Config,
  idList: string,
  name: string,
  desc?: string,
  pos?: string,
): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.createCard(idList, name, desc, pos)
}

export async function updateCard(config: Config, cardId: string, fields: Record<string, unknown>): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.updateCard(cardId, fields)
}

export async function deleteCard(config: Config, cardId: string): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.deleteCard(cardId)
}

export async function moveCard(config: Config, cardId: string, idList: string, idBoard?: string): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.moveCard(cardId, idList, idBoard)
}

export async function searchCards(config: Config, query: string, boardIds?: string): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.searchCards(query, boardIds)
}

export async function getCardActions(config: Config, cardId: string): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.getCardActions(cardId)
}

export async function getCardChecklists(config: Config, cardId: string): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.getCardChecklists(cardId)
}

// ── Lists ───────────────────────────────────────────────────────────

export async function getList(config: Config, listId: string): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.getList(listId)
}

export async function createList(config: Config, boardId: string, name: string, pos?: string): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.createList(boardId, name, pos)
}

export async function getListCards(config: Config, listId: string): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.getListCards(listId)
}

export async function archiveList(config: Config, listId: string): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.archiveList(listId)
}

export async function archiveAllCardsInList(config: Config, listId: string): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.archiveAllCardsInList(listId)
}

// ── Members ─────────────────────────────────────────────────────────

export async function getMember(config: Config, memberId: string): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.getMember(memberId)
}

// ── Labels ──────────────────────────────────────────────────────────

export async function getLabel(config: Config, labelId: string): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.getLabel(labelId)
}

export async function createLabel(config: Config, boardId: string, name: string, color: string): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.createLabel(boardId, name, color)
}

export async function deleteLabel(config: Config, labelId: string): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.deleteLabel(labelId)
}

export async function updateLabel(
  config: Config,
  labelId: string,
  fields: Record<string, unknown>,
): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.updateLabel(labelId, fields)
}

// ── Checklists ──────────────────────────────────────────────────────

export async function getChecklist(config: Config, checklistId: string): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.getChecklist(checklistId)
}

export async function createChecklist(config: Config, cardId: string, name: string): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.createChecklist(cardId, name)
}

export async function deleteChecklist(config: Config, checklistId: string): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.deleteChecklist(checklistId)
}

export async function createChecklistItem(config: Config, checklistId: string, name: string): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.createChecklistItem(checklistId, name)
}

export async function deleteChecklistItem(
  config: Config,
  checklistId: string,
  checkItemId: string,
): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.deleteChecklistItem(checklistId, checkItemId)
}

// ── Comments ────────────────────────────────────────────────────────

export async function addCardComment(config: Config, cardId: string, text: string): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.addCardComment(cardId, text)
}

export async function updateCardComment(
  config: Config,
  cardId: string,
  actionId: string,
  text: string,
): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.updateCardComment(cardId, actionId, text)
}

export async function deleteCardComment(config: Config, cardId: string, actionId: string): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.deleteCardComment(cardId, actionId)
}

// ── Connection ──────────────────────────────────────────────────────

export async function testConnection(config: Config): Promise<ApiResult> {
  const trello = await initTrello(config)
  return trello.testConnection()
}

// ── Cleanup ─────────────────────────────────────────────────────────

export function clearClients(): void {
  if (trelloApi) {
    trelloApi.clearClients()
    trelloApi = null
  }
}
