import {type ApiResult, createProfileManager, formatAsToon} from '@hesed/plugin-lib'
import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../../base-command.js'
import {clearClients, searchIssues} from '../../../jira/jira-client.js'

export default class IssueSearch extends BaseCommand {
  static override args = {
    jql: Args.string({description: 'JQL expression', required: true}),
  }

  static override description = 'Searches for issues using JQL'
  static override examples = [
    '<%= config.bin %> <%= command.id %> \'project=PROJ AND summary ~ "Error saving file" AND status IN ("ready", "in progress")\'',
    '<%= config.bin %> <%= command.id %> \'assignee="john@email.com" AND type=Bug\' --max 5 --next CiEjU3RyaW5nJlUwRlVTRkpGUlE9PSVJbnQmTkRFd05qST0QAhiQqtD4wTMiKGFzc2lnbmVlPSJhbGxlbkBpbmN1YmU4LnNnIiBBTkQgdHlwZT1CdWcqAltd',
    "<%= config.bin %> <%= command.id %> 'timeestimate > 4h' --fields comment,creator,timeestimate",
  ]

  static override flags = {
    fields: Flags.string({description: 'Extra list of fields to return', required: false}),
    max: Flags.integer({description: 'Maximum number of items per page', required: false}),
    next: Flags.string({description: 'Token for next page', required: false}),
    profile: Flags.string({char: 'p', description: 'Authentication profile name', required: false}),
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<ApiResult> {
    const {args, flags} = await this.parse(IssueSearch)
    const {loadAuthConfig} = createProfileManager(this.config, flags.profile, 'jira-config.json')
    const auth = await loadAuthConfig()
    if (!auth) {
      this.error(`Missing authentication config.`)
    }

    const result = await searchIssues(
      auth,
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
