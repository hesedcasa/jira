import {Args, Command} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {clearClients, deleteChecklistItem} from '../../../trello/trello-client.js'

export default class ChecklistDeleteItem extends Command {
  /* eslint-disable perfectionist/sort-objects */
  static override args = {
    checklistId: Args.string({description: 'Checklist ID', required: true}),
    checkItemId: Args.string({description: 'Check item ID', required: true}),
  }
  /* eslint-enable perfectionist/sort-objects */
  static override description = 'Delete an item from a checklist'
  static override examples = ['<%= config.bin %> <%= command.id %> checklistId123 itemId456']

  public async run(): Promise<void> {
    const {args} = await this.parse(ChecklistDeleteItem)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) return

    const result = await deleteChecklistItem(config.auth, args.checklistId, args.checkItemId)
    clearClients()

    this.logJson(result)
  }
}
