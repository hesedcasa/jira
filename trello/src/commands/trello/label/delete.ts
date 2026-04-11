import {Args, Command} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {clearClients, deleteLabel} from '../../../trello/trello-client.js'

export default class LabelDelete extends Command {
  static override args = {
    labelId: Args.string({description: 'Label ID', required: true}),
  }
  static override description = 'Delete a label'
  static override examples = ['<%= config.bin %> <%= command.id %> 5a1b2c3d']

  public async run(): Promise<void> {
    const {args} = await this.parse(LabelDelete)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) return

    const result = await deleteLabel(config.auth, args.labelId)
    clearClients()

    this.logJson(result)
  }
}
