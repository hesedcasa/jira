import {type ApiResult, createProfileManager, formatAsToon} from '@hesed/plugin-lib'
import {Flags} from '@oclif/core'

import {BaseCommand} from '../../../base-command.js'
import {clearClients, listProjects} from '../../../jira/jira-client.js'

export default class ProjectList extends BaseCommand {
  static override args = {}
  static override description = 'List all accessible projects'
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {
    profile: Flags.string({char: 'p', description: 'Authentication profile name', required: false}),
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<ApiResult> {
    const {flags} = await this.parse(ProjectList)
    const {loadAuthConfig} = createProfileManager(this.config, flags.profile, 'jira-config.json')
    const auth = await loadAuthConfig()
    if (!auth) {
      this.error(`Missing authentication config.`)
    }

    const result = await listProjects(auth)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    }

    return result
  }
}
