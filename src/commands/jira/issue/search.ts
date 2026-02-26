import {Args, Command, Flags} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {formatAsToon} from '../../../format.js'
import {clearClients, searchIssues} from '../../../jira/jira-client.js'

export default class IssueSearch extends Command {
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
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(IssueSearch)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) {
      return
    }

    const result = await searchIssues(
      config.auth,
      args.jql,
      flags.max,
      flags.next,
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
