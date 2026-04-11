import {Args, Command, Flags} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {formatAsToon} from '../../../format.js'
import {clearClients, getChecklist} from '../../../trello/trello-client.js'

export default class ChecklistGet extends Command {
  static override args = {
    checklistId: Args.string({description: 'Checklist ID', required: true}),
  }
  static override description = 'Get details of a specific checklist'
  static override examples = ['<%= config.bin %> <%= command.id %> 5a1b2c3d']
  static override flags = {
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(ChecklistGet)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) return

    const result = await getChecklist(config.auth, args.checklistId)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
