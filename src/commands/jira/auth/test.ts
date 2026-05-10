import {Command, Flags} from '@oclif/core'
import {action} from '@oclif/core/ux'

import {readConfig} from '../../../config.js'
import {ApiResult} from '../../../jira/jira-api.js'
import {clearClients, testConnection} from '../../../jira/jira-client.js'

export default class AuthTest extends Command {
  static override args = {}
  static override description = 'Test authentication and connection'
  static override enableJsonFlag = true
  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --profile work',
  ]
  static override flags = {
    profile: Flags.string({char: 'p', description: 'Authentication profile name', required: false}),
  }

  public async run(): Promise<ApiResult> {
    const {flags} = await this.parse(AuthTest)
    const config = await readConfig(this.config.configDir, this.log.bind(this), flags.profile)
    if (!config) {
      return {
        error: 'Missing authentication config',
        success: false,
      }
    }

    action.start('Authenticating connection')
    const result = await testConnection(config.auth)
    clearClients()

    if (result.success) {
      action.stop('✓ successful')
      this.log('Successful connect to Jira')
    } else {
      action.stop('✗ failed')
      this.error('Failed to connect to Jira.')
    }

    return result
  }
}
