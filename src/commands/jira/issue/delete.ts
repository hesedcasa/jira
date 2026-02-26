import {Args, Command} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {clearClients, deleteIssue} from '../../../jira/jira-client.js'

export default class IssueDelete extends Command {
  static override args = {
    issueId: Args.string({description: 'Issue ID or issue key to delete', required: true}),
  }
  static override description = 'Delete an issue'
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {}

  public async run(): Promise<void> {
    const {args} = await this.parse(IssueDelete)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) {
      return
    }

    const result = await deleteIssue(config.auth, args.issueId)
    clearClients()

    this.logJson(result)
  }
}
