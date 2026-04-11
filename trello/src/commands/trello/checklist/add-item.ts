import {Args, Command, Flags} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {formatAsToon} from '../../../format.js'
import {clearClients, createChecklistItem} from '../../../trello/trello-client.js'

export default class ChecklistAddItem extends Command {
  static override args = {
    checklistId: Args.string({description: 'Checklist ID', required: true}),
    name: Args.string({description: 'Check item name', required: true}),
  }
  static override description = 'Add an item to a checklist'
  static override examples = ['<%= config.bin %> <%= command.id %> checklistId123 "Buy groceries"']
  static override flags = {
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(ChecklistAddItem)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) return

    const result = await createChecklistItem(config.auth, args.checklistId, args.name)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
