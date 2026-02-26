import {Args, Command, Flags} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {clearClients, updateIssue} from '../../../jira/jira-client.js'

export default class IssueUpdate extends Command {
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
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(IssueUpdate)
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

    const result = await updateIssue(config.auth, args.issueId, fields)
    clearClients()

    this.logJson(result)
  }
}
