import {Args, Command, Flags} from '@oclif/core'

import {clearClients, getAllSprints} from '../../../agile/agile-client.js'
import {readConfig} from '../../../config.js'
import {formatAsToon} from '../../../format.js'

export default class BoardSprints extends Command {
  static override args = {
    boardId: Args.integer({description: 'Board ID', required: true}),
  }
  static override description = 'Get all sprints from a board'
  static override examples = [
    '<%= config.bin %> <%= command.id %> 123',
    '<%= config.bin %> <%= command.id %> 123 --state active',
  ]
  static override flags = {
    max: Flags.integer({description: 'Maximum number of items per page', required: false}),
    start: Flags.integer({description: 'Index of the first item to return', required: false}),
    state: Flags.string({description: 'Filters sprints in specified states (future, active, closed)', required: false}),
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(BoardSprints)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) {
      return
    }

    const result = await getAllSprints(config.auth, args.boardId, flags.max, flags.start, flags.state)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
