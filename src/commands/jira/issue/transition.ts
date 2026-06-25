import {type ApiResult, createProfileManager} from '@hesed/plugin-lib'
import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../../base-command.js'
import {clearClients, doTransition} from '../../../jira/jira-client.js'

export default class IssueTransition extends BaseCommand {
  static override args = {
    issueId: Args.string({description: 'Issue ID or issue key', required: true}),
    transitionId: Args.string({description: 'Issue transition ID', required: true}),
  }
  static override description = 'Performs an issue transition'
  static override examples = ['<%= config.bin %> <%= command.id %> PROJ-123 123']
  static override flags = {
    profile: Flags.string({char: 'p', description: 'Authentication profile name', required: false}),
  }

  public async run(): Promise<ApiResult> {
    const {args, flags} = await this.parse(IssueTransition)
    const {loadAuthConfig} = createProfileManager(this.config, flags.profile, 'jira-config.json')
    const auth = await loadAuthConfig()
    if (!auth) {
      this.error(`Missing authentication config.`)
    }

    const result = await doTransition(auth, args.issueId, args.transitionId)
    clearClients()

    return result
  }
}
