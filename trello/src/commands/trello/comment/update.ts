import {Args, Command, Flags} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {formatAsToon} from '../../../format.js'
import {clearClients, updateCardComment} from '../../../trello/trello-client.js'

export default class CommentUpdate extends Command {
  /* eslint-disable perfectionist/sort-objects */
  static override args = {
    cardId: Args.string({description: 'Card ID', required: true}),
    actionId: Args.string({description: 'Comment action ID', required: true}),
    text: Args.string({description: 'Updated comment text', required: true}),
  }
  /* eslint-enable perfectionist/sort-objects */
  static override description = 'Update a comment on a card'
  static override examples = ['<%= config.bin %> <%= command.id %> cardId123 actionId456 "Updated comment"']
  static override flags = {
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(CommentUpdate)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) return

    const result = await updateCardComment(config.auth, args.cardId, args.actionId, args.text)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
