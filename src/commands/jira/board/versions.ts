import {Args, Command, Flags} from '@oclif/core'

import {clearClients, getAllVersions} from '../../../agile/agile-client.js'
import {readConfig} from '../../../config.js'
import {formatAsToon} from '../../../format.js'

export default class BoardVersions extends Command {
  static override args = {
    boardId: Args.integer({description: 'Board ID', required: true}),
  }
  static override description = 'Get all sprints from a board'
  static override examples = [
    '<%= config.bin %> <%= command.id %> 123',
    '<%= config.bin %> <%= command.id %> 123 --released false',
  ]
  static override flags = {
    max: Flags.integer({description: 'Maximum number of items per page', required: false}),
    released: Flags.string({description: 'Filters versions release state (true, false)', required: false}),
    start: Flags.integer({description: 'Index of the first item to return', required: false}),
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(BoardVersions)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) {
      return
    }

    const result = await getAllVersions(config.auth, args.boardId, flags.max, flags.start, flags.released)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
