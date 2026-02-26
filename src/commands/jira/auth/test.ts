import {Command} from '@oclif/core'
import {action} from '@oclif/core/ux'

import {readConfig} from '../../../config.js'
import {ApiResult} from '../../../jira/jira-api.js'
import {clearClients, testConnection} from '../../../jira/jira-client.js'

export default class AuthTest extends Command {
  static override args = {}
  static override description = 'Test authentication and connection'
  static override enableJsonFlag = true
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {}

  public async run(): Promise<ApiResult> {
    const config = await readConfig(this.config.configDir, this.log.bind(this))
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
