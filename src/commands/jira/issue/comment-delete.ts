import {Args, Command, Flags} from '@oclif/core'

import {createProfileManager} from '@hesed/plugin-lib'
import {clearClients, deleteComment} from '../../../jira/jira-client.js'

export default class IssueDeleteComment extends Command {
  /* eslint-disable perfectionist/sort-objects */
  static override args = {
    issueId: Args.string({description: 'Issue ID or issue key', required: true}),
    id: Args.string({description: 'Comment ID to delete', required: true}),
  }
  /* eslint-enable perfectionist/sort-objects */
  static override description = 'Delete a comment'
  static override examples = ['<%= config.bin %> <%= command.id %> PROJ-123 123']
  static override flags = {
    profile: Flags.string({char: 'p', description: 'Authentication profile name', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(IssueDeleteComment)
    const {loadAuthConfig} = createProfileManager(this.config, flags.profile)
    const auth = await loadAuthConfig()
    if (!auth) {
      return
    }

    const result = await deleteComment(auth, args.id, args.issueId)
    clearClients()

    this.logJson(result)
  }
}
