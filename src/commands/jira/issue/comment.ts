import {Args, Command, Flags} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {formatAsToon} from '../../../format.js'
import {addComment, clearClients} from '../../../jira/jira-client.js'

export default class IssueAddComment extends Command {
  /* eslint-disable perfectionist/sort-objects */
  static override args = {
    issueId: Args.string({description: 'Issue ID or issue key', required: true}),
    body: Args.string({description: 'Comment text content', required: true}),
  }
  /* eslint-enable perfectionist/sort-objects */
  static override description = 'Add a comment to an issue'
  static override examples = [
    '<%= config.bin %> <%= command.id %> "\n# Header\n## Sub-header\n- Item 1\n- Item 2\n```bash\nls -a\n```" PROJ-123',
    '<%= config.bin %> <%= command.id %> "$(cat content.md)" PROJ-123',
  ]
  static override flags = {
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(IssueAddComment)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) {
      return
    }

    const result = await addComment(config.auth, args.issueId, args.body)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
