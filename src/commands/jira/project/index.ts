import {type ApiResult, createProfileManager, formatAsToon} from '@hesed/plugin-lib'
import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../../base-command.js'
import {clearClients, getProject} from '../../../jira/jira-client.js'

export default class ProjectGet extends BaseCommand {
  static override args = {
    projectId: Args.string({description: 'Project ID or project key', required: true}),
  }

  static override description = 'Get details of a specific project'
  static override examples = ['<%= config.bin %> <%= command.id %> PROJ']
  static override flags = {
    profile: Flags.string({char: 'p', description: 'Authentication profile name', required: false}),
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<ApiResult> {
    const {args, flags} = await this.parse(ProjectGet)
    const {loadAuthConfig} = createProfileManager(this.config, flags.profile, 'jira-config.json')
    const auth = await loadAuthConfig()
    if (!auth) {
      this.error(`Missing authentication config.`)
    }

    const result = await getProject(auth, args.projectId)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    }

    return result
  }
}
