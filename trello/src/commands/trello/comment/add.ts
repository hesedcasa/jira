import {Args, Command, Flags} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {formatAsToon} from '../../../format.js'
import {addCardComment, clearClients} from '../../../trello/trello-client.js'

export default class CommentAdd extends Command {
  static override args = {
    cardId: Args.string({description: 'Card ID', required: true}),
    text: Args.string({description: 'Comment text', required: true}),
  }
  static override description = 'Add a comment to a card'
  static override examples = ['<%= config.bin %> <%= command.id %> cardId123 "This is a comment"']
  static override flags = {
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(CommentAdd)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) return

    const result = await addCardComment(config.auth, args.cardId, args.text)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
