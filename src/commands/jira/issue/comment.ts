import {Args, Command, Flags} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {formatAsToon} from '../../../format.js'
import {addComment, addCommentWithMedia, clearClients} from '../../../jira/jira-client.js'

export default class IssueAddComment extends Command {
  /* eslint-disable perfectionist/sort-objects */
  static override args = {
    issueId: Args.string({description: 'Issue ID or issue key', required: true}),
    body: Args.string({description: 'Comment text content', required: true}),
  }
  /* eslint-enable perfectionist/sort-objects */
  static override description = 'Add a comment to an issue'
  static override examples = [
    '<%= config.bin %> <%= command.id %> PROJ-123 "# Header\n- Item 1"',
    '<%= config.bin %> <%= command.id %> PROJ-123 "$(cat content.md)"',
    '<%= config.bin %> <%= command.id %> PROJ-123 "See attached" --attach ./screenshot.png',
    '<%= config.bin %> <%= command.id %> PROJ-123 "See attached" --attach ./image.png --attach ./video.mp4',
  ]
  static override flags = {
    attach: Flags.string({
      description: 'Path to a file to upload and embed inline (can be used multiple times)',
      multiple: true,
      required: false,
    }),
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(IssueAddComment)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) {
      return
    }

    const result =
      flags.attach && flags.attach.length > 0
        ? await addCommentWithMedia(config.auth, args.issueId, args.body, flags.attach)
        : await addComment(config.auth, args.issueId, args.body)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
