import {createProfileManager, formatAsToon} from '@hesed/plugin-lib'
import {Args, Command, Flags} from '@oclif/core'

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
    '<%= config.bin %> <%= command.id %> PROJ-123 123',
    '<%= config.bin %> <%= command.id %> PROJ-123 123 ~/Desktop/test.jpg',
  ]
  static override flags = {
    profile: Flags.string({char: 'p', description: 'Authentication profile name', required: false}),
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(IssueDownloadAttachment)
    const {loadAuthConfig} = createProfileManager(this.config, flags.profile, 'jira-config.json')
    const auth = await loadAuthConfig()
    if (!auth) {
      this.error(`Missing authentication config.`)
    }

    const result = await downloadAttachment(auth, args.issueId, args.attachmentId, args.outputPath)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
