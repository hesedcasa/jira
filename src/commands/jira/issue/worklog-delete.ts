import {type ApiResult, createProfileManager} from '@hesed/plugin-lib'
import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../../base-command.js'
import {clearClients, deleteWorklog} from '../../../jira/jira-client.js'

export default class IssueDeleteWorklog extends BaseCommand {
  /* eslint-disable perfectionist/sort-objects -- issueId must be first arg per CLAUDE.md convention */
  static override args = {
    issueId: Args.string({description: 'Issue ID or issue key', required: true}),
    id: Args.string({description: 'Worklog ID to delete', required: true}),
  }

  /* eslint-enable perfectionist/sort-objects */
  static override description = 'Delete a worklog'
  static override examples = ['<%= config.bin %> <%= command.id %> PROJ-123 123']
  static override flags = {
    profile: Flags.string({char: 'p', description: 'Authentication profile name', required: false}),
  }

  public async run(): Promise<ApiResult> {
    const {args, flags} = await this.parse(IssueDeleteWorklog)
    const {loadAuthConfig} = createProfileManager(this.config, flags.profile, 'jira-config.json')
    const auth = await loadAuthConfig()
    if (!auth) {
      this.error(`Missing authentication config.`)
    }

    const result = await deleteWorklog(auth, args.id, args.issueId)
    clearClients()

    return result
  }
}
