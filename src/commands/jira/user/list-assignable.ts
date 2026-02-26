import {Args, Command, Flags} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {formatAsToon} from '../../../format.js'
import {clearClients, findAssignableUsers} from '../../../jira/jira-client.js'

export default class UserListAssignable extends Command {
  static override args = {
    issueId: Args.string({description: 'Issue ID or issue key', required: true}),
  }
  static override description = 'List users that can be assigned to an issue'
  static override examples = [
    '<%= config.bin %> <%= command.id %> PROJ-123',
    '<%= config.bin %> <%= command.id %> PROJ-123 -q john',
  ]
  static override flags = {
    query: Flags.string({char: 'q', description: 'Query string that matches user attributes', required: false}),
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(UserListAssignable)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) {
      return
    }

    const result = await findAssignableUsers(config.auth, args.issueId, flags.query)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
