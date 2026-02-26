import {Args, Command, Flags} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {formatAsToon} from '../../../format.js'
import {clearClients, downloadAttachment} from '../../../jira/jira-client.js'

export default class IssueDownloadAttachment extends Command {
  /* eslint-disable perfectionist/sort-objects */
  static override args = {
    issueId: Args.string({description: 'Issue ID or issue key', required: true}),
    attachmentId: Args.string({description: 'Attachment ID', required: true}),
    outputPath: Args.string({description: 'Output file path', required: false}),
  }
  /* eslint-enable perfectionist/sort-objects */
  static override description = 'Download attachment from an issue'
  static override examples = [
    '<%= config.bin %> <%= command.id %> 123 PROJ-123',
    '<%= config.bin %> <%= command.id %> 123 PROJ-123 ~/Desktop/test.jpg',
  ]
  static override flags = {
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(IssueDownloadAttachment)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) {
      return
    }

    const result = await downloadAttachment(config.auth, args.issueId, args.attachmentId, args.outputPath)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
