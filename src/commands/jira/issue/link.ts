import {type ApiResult, createProfileManager} from '@hesed/plugin-lib'
import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../../base-command.js'
import {clearClients, linkIssues} from '../../../jira/jira-client.js'

export default class IssueLink extends BaseCommand {
  static override args = {
    issueId: Args.string({
      description: 'Issue ID or issue key that carries the link type (e.g. for Blocks, the blocker)',
      required: true,
    }),
    linkedIssueId: Args.string({
      description: 'Issue ID or issue key the link points to (e.g. for Blocks, the blocked issue)',
      required: true,
    }),
  }

  static override description = 'Link two issues with an issue link type'
  static override examples = [
    '<%= config.bin %> <%= command.id %> PROJ-123 PROJ-456 --type Blocks   # PROJ-123 blocks PROJ-456',
    '<%= config.bin %> <%= command.id %> PROJ-123 PROJ-456 --type Relates',
    '<%= config.bin %> <%= command.id %> PROJ-123 PROJ-456 --type Duplicate --comment "Same root cause"',
  ]

  static override flags = {
    comment: Flags.string({description: 'Optional comment (Markdown) added with the link', required: false}),
    profile: Flags.string({char: 'p', description: 'Authentication profile name', required: false}),
    type: Flags.string({
      description: 'Issue link type name as configured on the site, e.g. Blocks, Relates, Duplicate',
      required: true,
    }),
  }

  public async run(): Promise<ApiResult> {
    const {args, flags} = await this.parse(IssueLink)
    const {loadAuthConfig} = createProfileManager(this.config, flags.profile, 'jira-config.json')
    const auth = await loadAuthConfig()
    if (!auth) {
      this.error(`Missing authentication config.`)
    }

    const result = await linkIssues(auth, args.issueId, args.linkedIssueId, flags.type, flags.comment)
    clearClients()

    return result
  }
}
