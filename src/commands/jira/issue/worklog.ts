import {Args, Command, Flags} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {formatAsToon} from '../../../format.js'
import {clearClients, worklog} from '../../../jira/jira-client.js'

export default class IssueWorklog extends Command {
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
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(IssueWorklog)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) {
      return
    }

    const result = await worklog(config.auth, args.issueId, args.started, args.timeSpent, args.comment)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
