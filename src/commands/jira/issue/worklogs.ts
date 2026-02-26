import {Args, Command, Flags} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {formatAsToon} from '../../../format.js'
import {clearClients, getIssueWorklog} from '../../../jira/jira-client.js'

export default class IssueGetWorklogs extends Command {
  static override args = {
    issueId: Args.string({description: 'Issue ID or issue key', required: true}),
  }
  static override description = 'List all boards'
  static override examples = ['<%= config.bin %> <%= command.id %> PROJ-123']
  static override flags = {
    max: Flags.integer({description: 'Maximum number of items per page', required: false}),
    start: Flags.integer({description: 'Index of the first item to return', required: false}),
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(IssueGetWorklogs)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) {
      return
    }

    const result = await getIssueWorklog(config.auth, args.issueId, flags.max, flags.start)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
