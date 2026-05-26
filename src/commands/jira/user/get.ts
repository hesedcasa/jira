import {Args, Command, Flags} from '@oclif/core'

import {createProfileManager} from '@hesed/plugin-lib'
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
    '<%= config.bin %> <%= command.id %> --query john',
    '<%= config.bin %> <%= command.id %> -q john@email.com',
  ]
  static override flags = {
    profile: Flags.string({char: 'p', description: 'Authentication profile name', required: false}),
    query: Flags.string({char: 'q', description: 'Query string that matches user attributes', required: false}),
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(UserGet)
    const {loadAuthConfig} = createProfileManager(this.config, flags.profile)
    const auth = await loadAuthConfig()
    if (!auth) {
      return
    }

    const result = await getUser(auth, args.accountId, flags.query)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
