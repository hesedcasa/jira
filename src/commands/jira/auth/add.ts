import {input} from '@inquirer/prompts'
import {Command, Flags} from '@oclif/core'
import {action} from '@oclif/core/ux'
import {default as fs} from 'fs-extra'
import {default as path} from 'node:path'

import {ApiResult} from '../../../jira/jira-api.js'
import {clearClients, testConnection} from '../../../jira/jira-client.js'

export default class AuthAdd extends Command {
  static override args = {}
  static override description = 'Add Atlassian authentication'
  static override enableJsonFlag = true
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {
    email: Flags.string({char: 'e', description: 'Account email:', required: !process.stdout.isTTY}),
    token: Flags.string({char: 't', description: 'API Token:', required: !process.stdout.isTTY}),
    url: Flags.string({
      char: 'u',
      description: 'Atlassian URL (start with https://):',
      required: !process.stdout.isTTY,
    }),
  }

  public async run(): Promise<ApiResult> {
    const {flags} = await this.parse(AuthAdd)

    const apiToken = flags.token ?? (await input({message: 'API Token:', required: true}))
    const email = flags.email ?? (await input({message: 'Account email:', required: true}))
    const host = flags.url ?? (await input({message: 'Atlassian instance URL (start with https://):', required: true}))
    const configPath = path.join(this.config.configDir, 'jira-config.json')
    const auth = {
      auth: {
        apiToken,
        email,
        host,
      },
    }

    const exists = await fs.pathExists(configPath)

    if (!exists) {
      await fs.createFile(configPath)
    }

    await fs.writeJSON(configPath, auth, {
      mode: 0o600, // owner read/write only
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
      this.error('Authentication is invalid. Please check your email, token, and URL.')
    }

    return result
  }
}
