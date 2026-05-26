import {createProfileManager, formatAsToon} from '@hesed/plugin-lib'
import {Args, Command, Flags} from '@oclif/core'

import {clearClients, getIssuesForBacklog} from '../../../agile/agile-client.js'

export default class BoardBacklogs extends Command {
  static override args = {
    boardId: Args.integer({description: 'Board ID', required: true}),
    jql: Args.string({description: 'JQL expression', required: false}),
  }
  static override description = "Get all issues from the board's backlog"
  static override examples = [
    '<%= config.bin %> <%= command.id %> 123 \'summary ~ "Error saving file" AND status IN ("ready", "in progress")\'',
    '<%= config.bin %> <%= command.id %> 123 \'assignee="john@email.com" AND type=Bug\' --max 5 --start 2',
    "<%= config.bin %> <%= command.id %> 123 'timeestimate > 4h' --fields comment,creator,timeestimate",
  ]
  static override flags = {
    fields: Flags.string({description: 'Extra list of fields to return', required: false}),
    max: Flags.integer({description: 'Maximum number of items per page', required: false}),
    profile: Flags.string({char: 'p', description: 'Authentication profile name', required: false}),
    start: Flags.integer({description: 'Index of the first item to return', required: false}),
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(BoardBacklogs)
    const {loadAuthConfig} = createProfileManager(this.config, flags.profile)
    const auth = await loadAuthConfig()
    if (!auth) {
      return
    }

    const result = await getIssuesForBacklog(
      auth,
      args.boardId,
      args.jql,
      flags.max,
      flags.start,
      flags.fields ? flags.fields.split(',') : undefined,
    )
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
