import {Args, Command, Flags} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {formatAsToon} from '../../../format.js'
import {clearClients, getUser} from '../../../jira/jira-client.js'

export default class UserGet extends Command {
  static override args = {
    accountId: Args.string({description: 'User account ID', required: false}),
  }
  static override description = 'Get user information'
  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> 5b10ac8d82e05b22cc7d4ef5',
    '<%= config.bin %> <%= command.id %> -query john',
    '<%= config.bin %> <%= command.id %> -q john@email.com',
  ]
  static override flags = {
    query: Flags.string({char: 'q', description: 'Query string that matches user attributes', required: false}),
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(UserGet)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) {
      return
    }

    const result = await getUser(config.auth, args.accountId, flags.query)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
