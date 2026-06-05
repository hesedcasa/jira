import {createProfileManager} from '@hesed/plugin-lib'
import {Args, Command, Flags} from '@oclif/core'

import {assignIssue, clearClients} from '../../../jira/jira-client.js'

export default class IssueAssign extends Command {
  /* eslint-disable perfectionist/sort-objects */
  static override args = {
    issueId: Args.string({description: 'Issue ID or issue key', required: true}),
    accountId: Args.string({description: 'Account ID of the user', required: true}),
  }
  /* eslint-enable perfectionist/sort-objects */
  static override description = 'Assigns an issue to a user'
  static override examples = ['<%= config.bin %> <%= command.id %> PROJ-123 5b10ac8d82e05b22cc7d4ef5']
  static override flags = {
    profile: Flags.string({char: 'p', description: 'Authentication profile name', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(IssueAssign)
    const {loadAuthConfig} = createProfileManager(this.config, flags.profile, 'jira-config.json')
    const auth = await loadAuthConfig()
    if (!auth) {
      this.error(`Missing authentication config.`)
    }

    const result = await assignIssue(auth, args.accountId, args.issueId)
    clearClients()

    this.logJson(result)
  }
}
