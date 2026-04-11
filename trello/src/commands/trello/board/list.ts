import {Command, Flags} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {formatAsToon} from '../../../format.js'
import {clearClients, getMyBoards} from '../../../trello/trello-client.js'

export default class BoardList extends Command {
  static override args = {}
  static override description = 'List all boards for the authenticated member'
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(BoardList)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) return

    const result = await getMyBoards(config.auth)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
