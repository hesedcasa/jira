import {createProfileManager, formatAsToon} from '@hesed/plugin-lib'
import {Args, Command, Flags} from '@oclif/core'

import {clearClients, getAllVersions} from '../../../agile/agile-client.js'

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
    profile: Flags.string({char: 'p', description: 'Authentication profile name', required: false}),
    released: Flags.string({description: 'Filters versions release state (true, false)', required: false}),
    start: Flags.integer({description: 'Index of the first item to return', required: false}),
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(BoardVersions)
    const {loadAuthConfig} = createProfileManager(this.config, flags.profile)
    const auth = await loadAuthConfig()
    if (!auth) {
      return
    }

    const result = await getAllVersions(auth, args.boardId, flags.max, flags.start, flags.released)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
