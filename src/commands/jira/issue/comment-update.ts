import {type ApiResult, createProfileManager, formatAsToon} from '@hesed/plugin-lib'
import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../../base-command.js'
import {clearClients, updateComment} from '../../../jira/jira-client.js'

export default class IssueUpdateComment extends BaseCommand {
  /* eslint-disable perfectionist/sort-objects -- issueId must be first arg per CLAUDE.md convention */
  static override args = {
    issueId: Args.string({description: 'Issue ID or issue key', required: true}),
    id: Args.string({description: 'Comment ID to delete', required: true}),
    body: Args.string({description: 'Comment text content', required: true}),
  }

  /* eslint-enable perfectionist/sort-objects */
  static override description = 'Update a comment'
  static override examples = [
    '<%= config.bin %> <%= command.id %> PROJ-123 123 "\n# Header\n## Sub-header\n- Item 1\n- Item 2\n```bash\nls -a\n```"',
    '<%= config.bin %> <%= command.id %> PROJ-123 123 "$(cat content.md)"',
  ]

  static override flags = {
    profile: Flags.string({char: 'p', description: 'Authentication profile name', required: false}),
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<ApiResult> {
    const {args, flags} = await this.parse(IssueUpdateComment)
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

    const result = await updateComment(auth, args.id, args.issueId, args.body)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    }

    return result
  }
}
