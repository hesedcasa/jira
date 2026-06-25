import {type ApiResult, createProfileManager, formatAsToon} from '@hesed/plugin-lib'
import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../../base-command.js'
import {clearClients, worklog} from '../../../jira/jira-client.js'

export default class IssueWorklog extends BaseCommand {
  /* eslint-disable perfectionist/sort-objects */
  static override args = {
    issueId: Args.string({description: 'Issue ID or issue key', required: true}),
    started: Args.string({description: 'Datetime the worklog effort started', required: true}),
    timeSpent: Args.string({description: 'Time spent working on the issue', required: true}),
    comment: Args.string({description: 'Comment text content', required: false}),
  }
  static override description = 'Add a worklog to an issue'
  static override examples = [
    '<%= config.bin %> <%= command.id %> PROJ-123 2026-02-03T12:34:00.000+0000 "1d 4h" "\n# Header\n## Sub-header"',
    '<%= config.bin %> <%= command.id %> PROJ-123 $(date +"%Y-%m-%dT%H:%M:%S.000%z") 6h "Fix test"',
    '<%= config.bin %> <%= command.id %> PROJ-123 $(date +"%Y-%m-%dT08:30:00.000%z") 6h',
  ]
  static override flags = {
    profile: Flags.string({char: 'p', description: 'Authentication profile name', required: false}),
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<ApiResult> {
    const {args, flags} = await this.parse(IssueWorklog)
    const {loadAuthConfig} = createProfileManager(this.config, flags.profile, 'jira-config.json')
    const auth = await loadAuthConfig()
    if (!auth) {
      this.error(`Missing authentication config.`)
    }

    const result = await worklog(auth, args.issueId, args.started, args.timeSpent, args.comment)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    }

    return result
  }
}
