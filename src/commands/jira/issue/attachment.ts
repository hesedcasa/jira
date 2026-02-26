import {Args, Command, Flags} from '@oclif/core'
import {action} from '@oclif/core/ux'

import {readConfig} from '../../../config.js'
import {formatAsToon} from '../../../format.js'
import {addAttachment, clearClients} from '../../../jira/jira-client.js'

export default class IssueAttachment extends Command {
  /* eslint-disable perfectionist/sort-objects */
  static override args = {
    issueId: Args.string({description: 'Issue ID or issue key', required: true}),
    file: Args.string({description: 'Path to the file to upload', required: true}),
  }
  /* eslint-enable perfectionist/sort-objects */
  static override description = 'Add an attachment to a Jira issue'
  static override examples = ['<%= config.bin %> <%= command.id %> ./document.pdf PROJ-123']
  static override flags = {
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(IssueAttachment)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) {
      return
    }

    action.start(`Uploading attachment "${args.file}" to issue ${args.issueId}`)

    const result = await addAttachment(config.auth, args.issueId, args.file)
    clearClients()

    if (result.success) {
      action.stop('✓ Successfully uploaded')
    } else {
      action.stop('✗ Upload failed')
    }

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
