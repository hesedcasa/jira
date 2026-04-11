import {Args, Command} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {clearClients, deleteChecklist} from '../../../trello/trello-client.js'

export default class ChecklistDelete extends Command {
  static override args = {
    checklistId: Args.string({description: 'Checklist ID', required: true}),
  }
  static override description = 'Delete a checklist'
  static override examples = ['<%= config.bin %> <%= command.id %> 5a1b2c3d']

  public async run(): Promise<void> {
    const {args} = await this.parse(ChecklistDelete)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) return

    const result = await deleteChecklist(config.auth, args.checklistId)
    clearClients()

    this.logJson(result)
  }
}
