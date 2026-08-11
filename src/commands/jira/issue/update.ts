import {type ApiResult, createProfileManager} from '@hesed/plugin-lib'
import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../../base-command.js'
import {clearClients, updateIssue} from '../../../jira/jira-client.js'

export default class IssueUpdate extends BaseCommand {
  static override args = {
    issueId: Args.string({description: 'Issue ID or issue key', required: true}),
  }

  static override description = 'Update an existing issue'
  static override examples = [
    "<%= config.bin %> <%= command.id %> PROJ-123 --fields summary='New summary' description='New description'",
    "<%= config.bin %> <%= command.id %> PROJ-123 --fields description='\n# Header\n## Sub-header\n- Item 1\n- Item 2\n```bash\nls -a\n```'",
    '<%= config.bin %> <%= command.id %> PROJ-123 --fields description="$(cat content.md)"',
    '<%= config.bin %> <%= command.id %> PROJ-123 --fields timetracking=\'{"originalEstimate": "5h"}\'',
  ]

  static override flags = {
    fields: Flags.string({description: 'Issue fields to update in key=value format', multiple: true, required: true}),
    profile: Flags.string({char: 'p', description: 'Authentication profile name', required: false}),
  }

  public async run(): Promise<ApiResult> {
    const {args, flags} = await this.parse(IssueUpdate)
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

    const result = await updateIssue(auth, args.issueId, fields)
    clearClients()

    return result
  }
}
