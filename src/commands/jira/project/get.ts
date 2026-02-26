import {Args, Command, Flags} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {formatAsToon} from '../../../format.js'
import {clearClients, getProject} from '../../../jira/jira-client.js'

export default class ProjectGet extends Command {
  static override args = {
    projectId: Args.string({description: 'Project ID or project key', required: true}),
  }
  static override description = 'Get details of a specific project'
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(ProjectGet)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) {
      return
    }

    const result = await getProject(config.auth, args.projectId)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
