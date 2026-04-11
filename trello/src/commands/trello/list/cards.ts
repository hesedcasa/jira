import {Args, Command, Flags} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {formatAsToon} from '../../../format.js'
import {clearClients, getListCards} from '../../../trello/trello-client.js'

export default class ListCards extends Command {
  static override args = {
    listId: Args.string({description: 'List ID', required: true}),
  }
  static override description = 'Get all cards in a list'
  static override examples = ['<%= config.bin %> <%= command.id %> 5a1b2c3d']
  static override flags = {
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(ListCards)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) return

    const result = await getListCards(config.auth, args.listId)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
