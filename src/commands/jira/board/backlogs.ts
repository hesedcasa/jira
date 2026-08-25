import {type ApiResult, createProfileManager, formatAsToon} from '@hesed/plugin-lib'
import {Args, Flags} from '@oclif/core'

import {clearClients, getIssuesForBacklog} from '../../../agile/agile-client.js'
import {BaseCommand} from '../../../base-command.js'

export default class BoardBacklogs extends BaseCommand {
  static override args = {
    boardId: Args.integer({description: 'Board ID', required: true}),
    jql: Args.string({description: 'JQL expression', required: false}),
  }

  static override description = "Get all issues from the board's backlog"
  static override examples = [
    '<%= config.bin %> <%= command.id %> 123 \'summary ~ "Error saving file" AND status IN ("ready", "in progress")\'',
    '<%= config.bin %> <%= command.id %> 123 \'assignee="john@email.com" AND type=Bug\' --max 5 --next CiEjU3RyaW5nJlUwRlVTRkpGUlE9PQ',
    "<%= config.bin %> <%= command.id %> 123 'timeestimate > 4h' --fields comment,creator,timeestimate",
  ]

  static override flags = {
    fields: Flags.string({description: 'Extra list of fields to return', required: false}),
    max: Flags.integer({description: 'Maximum number of items per page', required: false}),
    next: Flags.string({description: 'Token for next page', required: false}),
    profile: Flags.string({char: 'p', description: 'Authentication profile name', required: false}),
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<ApiResult> {
    const {args, flags} = await this.parse(BoardBacklogs)
    const {loadAuthConfig} = createProfileManager(this.config, flags.profile, 'jira-config.json')
    const auth = await loadAuthConfig()
    if (!auth) {
      this.error(`Missing authentication config.`)
    }

    const result = await getIssuesForBacklog(
      auth,
      args.boardId,
      args.jql,
      flags.max,
      flags.next,
      flags.fields ? flags.fields.split(',') : undefined,
    )
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    }

    return result
  }
}
