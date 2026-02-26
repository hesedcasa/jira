import {Command, Flags} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {formatAsToon} from '../../../format.js'
import {clearClients, listProjects} from '../../../jira/jira-client.js'

export default class ProjectList extends Command {
  static override args = {}
  static override description = 'List all accessible projects'
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(ProjectList)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) {
      return
    }

    const result = await listProjects(config.auth)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
