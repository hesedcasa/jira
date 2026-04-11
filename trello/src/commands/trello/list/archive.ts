import {Args, Command, Flags} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {archiveAllCardsInList, archiveList, clearClients} from '../../../trello/trello-client.js'

export default class ListArchive extends Command {
  static override args = {
    listId: Args.string({description: 'List ID', required: true}),
  }
  static override description = 'Archive a list or all cards in a list'
  static override examples = [
    '<%= config.bin %> <%= command.id %> 5a1b2c3d',
    '<%= config.bin %> <%= command.id %> 5a1b2c3d --cards-only',
  ]
  static override flags = {
    'cards-only': Flags.boolean({description: 'Only archive cards in the list, not the list itself', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(ListArchive)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) return

    const result = flags['cards-only']
      ? await archiveAllCardsInList(config.auth, args.listId)
      : await archiveList(config.auth, args.listId)
    clearClients()

    this.logJson(result)
  }
}
