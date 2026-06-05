import {createProfileManager, formatAsToon} from '@hesed/plugin-lib'
import {Args, Command, Flags} from '@oclif/core'

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
    '<%= config.bin %> <%= command.id %> PROJ-123 "Here is the [bug](https://example.com/bug):\n\n![screenshot](./screenshot.png)" --attach ./screenshot.png',
    '<%= config.bin %> <%= command.id %> PROJ-123 "Step 1:\n\n![step1](./step1.png)\n\nStep 2:\n\n![step2](./step2.png)" --attach ./step1.png --attach ./step2.mp4',
    '<%= config.bin %> <%= command.id %> PROJ-123 "See also" --attach ./extra.png',
  ]
  static override flags = {
    attach: Flags.string({
      description: 'Path to a file to upload and embed inline (can be used multiple times)',
      multiple: true,
      required: false,
    }),
    parent: Flags.string({description: 'Parent comment ID to reply to', required: false}),
    profile: Flags.string({char: 'p', description: 'Authentication profile name', required: false}),
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(IssueAddComment)
    const {loadAuthConfig} = createProfileManager(this.config, flags.profile, 'jira-config.json')
    const auth = await loadAuthConfig()
    if (!auth) {
      this.error(`Missing authentication config.`)
    }

    const result =
      flags.attach && flags.attach.length > 0
        ? await addCommentWithMedia(auth, args.issueId, args.body, flags.attach, flags.parent)
        : await addComment(auth, args.issueId, args.body, flags.parent)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
