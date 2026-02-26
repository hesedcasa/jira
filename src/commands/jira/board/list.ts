import {Args, Command, Flags} from '@oclif/core'

import {clearClients, getAllBoards} from '../../../agile/agile-client.js'
import {readConfig} from '../../../config.js'
import {formatAsToon} from '../../../format.js'

export default class BoardList extends Command {
  static override args = {
    projectId: Args.string({description: 'Project ID or project key', required: false}),
  }
  static override description = 'Get all boards'
  static override examples = ['<%= config.bin %> <%= command.id %>', '<%= config.bin %> <%= command.id %> PROJ']
  static override flags = {
    max: Flags.integer({description: 'Maximum number of items per page', required: false}),
    start: Flags.integer({description: 'Index of the first item to return', required: false}),
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(BoardList)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) {
      return
    }

    const result = await getAllBoards(config.auth, args.projectId, flags.max, flags.start)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
