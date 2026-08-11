import {type ApiResult, createProfileManager, formatAsToon} from '@hesed/plugin-lib'
import {Args, Flags} from '@oclif/core'

import {clearClients, getAllSprints} from '../../../agile/agile-client.js'
import {BaseCommand} from '../../../base-command.js'

export default class BoardSprints extends BaseCommand {
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
    profile: Flags.string({char: 'p', description: 'Authentication profile name', required: false}),
    start: Flags.integer({description: 'Index of the first item to return', required: false}),
    state: Flags.string({description: 'Filters sprints in specified states (future, active, closed)', required: false}),
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<ApiResult> {
    const {args, flags} = await this.parse(BoardSprints)
    const {loadAuthConfig} = createProfileManager(this.config, flags.profile, 'jira-config.json')
    const auth = await loadAuthConfig()
    if (!auth) {
      this.error(`Missing authentication config.`)
    }

    const result = await getAllSprints(auth, args.boardId, flags.max, flags.start, flags.state)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    }

    return result
  }
}
