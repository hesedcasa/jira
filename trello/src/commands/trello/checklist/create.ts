import {Args, Command, Flags} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {formatAsToon} from '../../../format.js'
import {clearClients, createChecklist} from '../../../trello/trello-client.js'

export default class ChecklistCreate extends Command {
  static override args = {
    cardId: Args.string({description: 'Card ID', required: true}),
    name: Args.string({description: 'Checklist name', required: true}),
  }
  static override description = 'Create a new checklist on a card'
  static override examples = ['<%= config.bin %> <%= command.id %> cardId123 "My Checklist"']
  static override flags = {
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(ChecklistCreate)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) return

    const result = await createChecklist(config.auth, args.cardId, args.name)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
