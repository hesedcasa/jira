import {Args, Command} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {clearClients, deleteCardComment} from '../../../trello/trello-client.js'

export default class CommentDelete extends Command {
  /* eslint-disable perfectionist/sort-objects */
  static override args = {
    cardId: Args.string({description: 'Card ID', required: true}),
    actionId: Args.string({description: 'Comment action ID', required: true}),
  }
  /* eslint-enable perfectionist/sort-objects */
  static override description = 'Delete a comment from a card'
  static override examples = ['<%= config.bin %> <%= command.id %> cardId123 actionId456']

  public async run(): Promise<void> {
    const {args} = await this.parse(CommentDelete)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) return

    const result = await deleteCardComment(config.auth, args.cardId, args.actionId)
    clearClients()

    this.logJson(result)
  }
}
