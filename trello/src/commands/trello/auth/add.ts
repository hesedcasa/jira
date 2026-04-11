import {input} from '@inquirer/prompts'
import {Command, Flags} from '@oclif/core'
import {action} from '@oclif/core/ux'
import {default as fs} from 'fs-extra'
import {default as path} from 'node:path'

import {ApiResult} from '../../../trello/trello-api.js'
import {clearClients, testConnection} from '../../../trello/trello-client.js'

export default class AuthAdd extends Command {
  static override args = {}
  static override description = 'Add Trello authentication'
  static override enableJsonFlag = true
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {
    key: Flags.string({char: 'k', description: 'Trello API key', required: !process.stdout.isTTY}),
    token: Flags.string({char: 't', description: 'Trello API token', required: !process.stdout.isTTY}),
  }

  public async run(): Promise<ApiResult> {
    const {flags} = await this.parse(AuthAdd)

    const apiKey = flags.key ?? (await input({message: 'Trello API key:', required: true}))
    const apiToken = flags.token ?? (await input({message: 'Trello API token:', required: true}))
    const configPath = path.join(this.config.configDir, 'trello-config.json')
    const auth = {
      auth: {
        apiKey,
        apiToken,
      },
    }

    const exists = await fs.pathExists(configPath)

    if (!exists) {
      await fs.createFile(configPath)
    }

    await fs.writeJSON(configPath, auth, {
      mode: 0o600,
    })

    action.start('Authenticating')
    const config = await fs.readJSON(configPath)
    const result = await testConnection(config.auth)
    clearClients()

    if (result.success) {
      action.stop('✓ successful')
      this.log('Authentication added successfully')
    } else {
      action.stop('✗ failed')
      this.error('Authentication is invalid. Please check your API key and token.')
    }

    return result
  }
}
