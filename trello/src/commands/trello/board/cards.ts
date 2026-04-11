import {Args, Command, Flags} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {formatAsToon} from '../../../format.js'
import {clearClients, getBoardCards} from '../../../trello/trello-client.js'

export default class BoardCards extends Command {
  static override args = {
    boardId: Args.string({description: 'Board ID', required: true}),
  }
  static override description = 'Get all cards on a board'
  static override examples = ['<%= config.bin %> <%= command.id %> 5a1b2c3d']
  static override flags = {
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(BoardCards)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) return

    const result = await getBoardCards(config.auth, args.boardId)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
