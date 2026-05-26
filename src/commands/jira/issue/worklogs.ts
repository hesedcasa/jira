import {Args, Command, Flags} from '@oclif/core'

import {createProfileManager} from '@hesed/plugin-lib'
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
    profile: Flags.string({char: 'p', description: 'Authentication profile name', required: false}),
    start: Flags.integer({description: 'Index of the first item to return', required: false}),
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(IssueGetWorklogs)
    const {loadAuthConfig} = createProfileManager(this.config, flags.profile)
    const auth = await loadAuthConfig()
    if (!auth) {
      return
    }

    const result = await getIssueWorklog(auth, args.issueId, flags.max, flags.start)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
