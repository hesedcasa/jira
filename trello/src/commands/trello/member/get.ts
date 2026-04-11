import {Args, Command, Flags} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {formatAsToon} from '../../../format.js'
import {clearClients, getMember} from '../../../trello/trello-client.js'

export default class MemberGet extends Command {
  static override args = {
    memberId: Args.string({default: 'me', description: 'Member ID or username (defaults to "me")', required: false}),
  }
  static override description = 'Get member details'
  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> me',
    '<%= config.bin %> <%= command.id %> johndoe',
  ]
  static override flags = {
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(MemberGet)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) return

    const result = await getMember(config.auth, args.memberId)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
