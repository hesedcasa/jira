import {Args, Command} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {clearClients, deleteCard} from '../../../trello/trello-client.js'

export default class CardDelete extends Command {
  static override args = {
    cardId: Args.string({description: 'Card ID', required: true}),
  }
  static override description = 'Delete a card'
  static override examples = ['<%= config.bin %> <%= command.id %> 5a1b2c3d']

  public async run(): Promise<void> {
    const {args} = await this.parse(CardDelete)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) return

    const result = await deleteCard(config.auth, args.cardId)
    clearClients()

    this.logJson(result)
  }
}
