import {Args, Command, Flags} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {formatAsToon} from '../../../format.js'
import {clearClients, updateComment} from '../../../jira/jira-client.js'

export default class IssueUpdateComment extends Command {
  /* eslint-disable perfectionist/sort-objects */
  static override args = {
    issueId: Args.string({description: 'Issue ID or issue key', required: true}),
    id: Args.string({description: 'Comment ID to delete', required: true}),
    body: Args.string({description: 'Comment text content', required: true}),
  }
  /* eslint-enable perfectionist/sort-objects */
  static override description = 'Update a comment'
  static override examples = [
    '<%= config.bin %> <%= command.id %> "\n# Header\n## Sub-header\n- Item 1\n- Item 2\n```bash\nls -a\n```" 123 PROJ-123',
    '<%= config.bin %> <%= command.id %> "$(cat content.md)" 123 PROJ-123',
  ]
  static override flags = {
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(IssueUpdateComment)
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

    const result = await updateComment(config.auth, args.id, args.issueId, args.body)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
