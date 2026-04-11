import {Args, Command, Flags} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {formatAsToon} from '../../../format.js'
import {clearClients, createCard} from '../../../trello/trello-client.js'

export default class CardCreate extends Command {
  static override args = {
    listId: Args.string({description: 'List ID to add the card to', required: true}),
    name: Args.string({description: 'Card name', required: true}),
  }
  static override description = 'Create a new card'
  static override examples = [
    '<%= config.bin %> <%= command.id %> 5a1b2c3d "My new card"',
    '<%= config.bin %> <%= command.id %> 5a1b2c3d "My new card" --desc "Card description" --pos top',
  ]
  static override flags = {
    desc: Flags.string({description: 'Card description', required: false}),
    pos: Flags.string({description: 'Position of the card (top, bottom)', options: ['top', 'bottom'], required: false}),
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(CardCreate)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) return

    const result = await createCard(config.auth, args.listId, args.name, flags.desc, flags.pos)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
