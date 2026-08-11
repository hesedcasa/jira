import {type ApiResult, createProfileManager} from '@hesed/plugin-lib'
import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../../base-command.js'
import {clearClients, deleteIssue} from '../../../jira/jira-client.js'

export default class IssueDelete extends BaseCommand {
  static override args = {
    issueId: Args.string({description: 'Issue ID or issue key to delete', required: true}),
  }

  static override description = 'Delete an issue'
  static override examples = ['<%= config.bin %> <%= command.id %> PROJ-123']
  static override flags = {
    profile: Flags.string({char: 'p', description: 'Authentication profile name', required: false}),
  }

  public async run(): Promise<ApiResult> {
    const {args, flags} = await this.parse(IssueDelete)
    const {loadAuthConfig} = createProfileManager(this.config, flags.profile, 'jira-config.json')
    const auth = await loadAuthConfig()
    if (!auth) {
      this.error(`Missing authentication config.`)
    }

    const result = await deleteIssue(auth, args.issueId)
    clearClients()

    return result
  }
}
