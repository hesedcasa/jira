import {Args, Command} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {assignIssue, clearClients} from '../../../jira/jira-client.js'

export default class IssueAssign extends Command {
  /* eslint-disable perfectionist/sort-objects */
  static override args = {
    issueId: Args.string({description: 'Issue ID or issue key', required: true}),
    accountId: Args.string({description: 'Account ID of the user', required: true}),
  }
  /* eslint-enable perfectionist/sort-objects */
  static override description = 'Assigns an issue to a user'
  static override examples = ['<%= config.bin %> <%= command.id %> 5b10ac8d82e05b22cc7d4ef5 PROJ-123']
  static override flags = {}

  public async run(): Promise<void> {
    const {args} = await this.parse(IssueAssign)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) {
      return
    }

    const result = await assignIssue(config.auth, args.accountId, args.issueId)
    clearClients()

    this.logJson(result)
  }
}
