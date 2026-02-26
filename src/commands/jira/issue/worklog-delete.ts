import {Args, Command} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {clearClients, deleteWorklog} from '../../../jira/jira-client.js'

export default class IssueDeleteWorklog extends Command {
  /* eslint-disable perfectionist/sort-objects */
  static override args = {
    issueId: Args.string({description: 'Issue ID or issue key', required: true}),
    id: Args.string({description: 'Worklog ID to delete', required: true}),
  }
  /* eslint-enable perfectionist/sort-objects */
  static override description = 'Delete a worklog'
  static override examples = ['<%= config.bin %> <%= command.id %> 123 PROJ-123']
  static override flags = {}

  public async run(): Promise<void> {
    const {args} = await this.parse(IssueDeleteWorklog)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) {
      return
    }

    const result = await deleteWorklog(config.auth, args.id, args.issueId)
    clearClients()

    this.logJson(result)
  }
}
