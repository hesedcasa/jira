import {Args, Command} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {clearClients, doTransition} from '../../../jira/jira-client.js'

export default class IssueTransition extends Command {
  static override args = {
    issueId: Args.string({description: 'Issue ID or issue key', required: true}),
    transitionId: Args.string({description: 'Issue transition ID', required: true}),
  }
  static override description = 'Performs an issue transition'
  static override examples = ['<%= config.bin %> <%= command.id %> PROJ-123 123']
  static override flags = {}

  public async run(): Promise<void> {
    const {args} = await this.parse(IssueTransition)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) {
      return
    }

    const result = await doTransition(config.auth, args.issueId, args.transitionId)
    clearClients()

    this.logJson(result)
  }
}
