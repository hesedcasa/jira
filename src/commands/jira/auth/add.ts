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
  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --profile work',
  ]
  static override flags = {
    email: Flags.string({char: 'e', description: 'Account email', required: false}),
    profile: Flags.string({char: 'p', description: 'Profile name', required: false}),
    token: Flags.string({char: 't', description: 'API Token', required: !process.stdout.isTTY}),
    url: Flags.string({
      char: 'u',
      description: 'Atlassian URL (start with https://)',
      required: !process.stdout.isTTY,
    }),
  }

  public async run(): Promise<ApiResult> {
    const {flags} = await this.parse(AuthAdd)
    const profileName =
      flags.profile ?? (process.stdout.isTTY ? await input({message: 'Profile name:', required: true}) : 'default')
    const apiToken = flags.token ?? (await input({message: 'API Token:', required: true}))
    const email = flags.email ?? (await input({message: 'Account email:', required: false}))
    const host = flags.url ?? (await input({message: 'Atlassian instance URL (start with https://):', required: true}))
    const configFilePath = path.join(this.config.configDir, 'jira-config.json')

    let existing: Record<string, unknown> = {}
    try {
      existing = await fs.readJSON(configFilePath)
    } catch {
      // file doesn't exist yet
    }

    const profiles = (existing.profiles ?? (existing.auth ? {default: existing.auth} : {})) as Record<string, unknown>

    if (profileName in profiles) {
      this.error(`Profile '${profileName}' already exists. Use 'jira auth update' to modify it.`)
    }

    profiles[profileName] = {apiToken, ...(email && {email}), host}
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {auth: _auth, ...rest} = existing
    await fs.outputJSON(configFilePath, {...rest, profiles}, {mode: 0o600})

    action.start('Authenticating')
    const result = await testConnection({apiToken, ...(email && {email}), host})
    clearClients()

    if (result.success) {
      action.stop('✓ successful')
      const profileSuffix = profileName === 'default' ? '' : ` as profile '${profileName}'`
      this.log(`Authentication added${profileSuffix} successfully`)
    } else {
      action.stop('✗ failed')
      this.error('Authentication is invalid. Please check your email, token, and URL.')
    }

    return result
  }
}
