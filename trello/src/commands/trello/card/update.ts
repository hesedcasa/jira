import {Args, Command, Flags} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {formatAsToon} from '../../../format.js'
import {clearClients, updateCard} from '../../../trello/trello-client.js'

export default class CardUpdate extends Command {
  static override args = {
    cardId: Args.string({description: 'Card ID', required: true}),
  }
  static override description = 'Update an existing card'
  static override examples = [
    '<%= config.bin %> <%= command.id %> 5a1b2c3d --fields name="Updated name" desc="New description"',
  ]
  static override flags = {
    fields: Flags.string({description: 'Card fields to update in key=value format', multiple: true, required: true}),
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(CardUpdate)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) return

    const fields: Record<string, string> = {}
    if (flags.fields) {
      for (const field of flags.fields) {
        const [key, ...valueParts] = field.split('=')
        const value = valueParts.join('=')
        fields[key] = value
      }
    }

    const result = await updateCard(config.auth, args.cardId, fields)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
