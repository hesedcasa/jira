import {Args, Command, Flags} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {formatAsToon} from '../../../format.js'
import {clearClients, moveCard} from '../../../trello/trello-client.js'

export default class CardMove extends Command {
  static override args = {
    cardId: Args.string({description: 'Card ID', required: true}),
    listId: Args.string({description: 'Target list ID', required: true}),
  }
  static override description = 'Move a card to a different list'
  static override examples = [
    '<%= config.bin %> <%= command.id %> cardId123 listId456',
    '<%= config.bin %> <%= command.id %> cardId123 listId456 --board boardId789',
  ]
  static override flags = {
    board: Flags.string({description: 'Target board ID (for cross-board moves)', required: false}),
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(CardMove)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) return

    const result = await moveCard(config.auth, args.cardId, args.listId, flags.board)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
