import {type ApiResult, createProfileManager, formatAsToon} from '@hesed/plugin-lib'
import {Flags} from '@oclif/core'

import {BaseCommand} from '../../../base-command.js'
import {clearClients, createIssue} from '../../../jira/jira-client.js'

export default class IssueCreate extends BaseCommand {
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
    profile: Flags.string({char: 'p', description: 'Authentication profile name', required: false}),
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<ApiResult> {
    const {flags} = await this.parse(IssueCreate)
    const {loadAuthConfig} = createProfileManager(this.config, flags.profile, 'jira-config.json')
    const auth = await loadAuthConfig()
    if (!auth) {
      this.error(`Missing authentication config.`)
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
      if (!(required in fields)) {
        this.error(`Required field "${required}" is missing`)
      }
    }

    const result = await createIssue(auth, fields)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    }

    return result
  }
}
