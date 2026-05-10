import {Args, Command, Flags} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {clearClients, deleteIssue} from '../../../jira/jira-client.js'

export default class IssueDelete extends Command {
  static override args = {
    issueId: Args.string({description: 'Issue ID or issue key to delete', required: true}),
  }
  static override description = 'Delete an issue'
  static override examples = ['<%= config.bin %> <%= command.id %> PROJ-123']
  static override flags = {
    profile: Flags.string({char: 'p', description: 'Authentication profile name', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(IssueDelete)
    const config = await readConfig(this.config.configDir, this.log.bind(this), flags.profile)
    if (!config) {
      return
    }

    const result = await deleteIssue(config.auth, args.issueId)
    clearClients()

    this.logJson(result)
  }
}
