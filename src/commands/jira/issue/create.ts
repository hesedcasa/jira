import {Command, Flags} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {formatAsToon} from '../../../format.js'
import {clearClients, createIssue} from '../../../jira/jira-client.js'

export default class IssueCreate extends Command {
  static override args = {}
  static override description = 'Create a new issue'
  static override examples = [
    '<%= config.bin %> <%= command.id %> --fields project=\'{"key":"PROJ"}\' summary="New summary" description="New description" issuetype=\'{"name":"Dev Task"}\'',
    '<%= config.bin %> <%= command.id %> --fields project=\'{"key":"PROJ"}\' summary="New summary" timetracking=\'{"originalEstimate": "5h"}\' issuetype=\'{"name":"Task"}\' description=\'\n# Header\n## Sub-header\n- Item 1\n- Item 2\n```bash\nls -a\n```\'',
  ]
  static override flags = {
    fields: Flags.string({
      description: 'Minimum fields required: project, summary, description & issuetype',
      multiple: true,
      required: true,
      summary: 'Issue fields in key=value format',
    }),
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(IssueCreate)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) {
      return
    }

    const fields: Record<string, string> = {}
    if (flags.fields) {
      for (const field of flags.fields) {
        const [key, ...valueParts] = field.split('=')
        const value = valueParts.join('=')
        fields[key] = value
      }
    }

    const requiredFields = ['project', 'summary', 'description', 'issuetype']
    for (const required of requiredFields) {
      if (!fields[required]) {
        this.error(`Required field "${required}" is missing`)
      }
    }

    const result = await createIssue(config.auth, fields)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
