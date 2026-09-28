import {type ApiResult, createProfileManager} from '@hesed/plugin-lib'
import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../../base-command.js'
import {clearClients, updateIssue} from '../../../jira/jira-client.js'
import {duplicateFieldsError, parseKeyValuePairs} from '../../../utils.js'

export default class IssueUpdate extends BaseCommand {
  static override args = {
    issueId: Args.string({description: 'Issue ID or issue key', required: true}),
  }

  static override description = 'Update an existing issue'
  static override examples = [
    "<%= config.bin %> <%= command.id %> PROJ-123 --fields summary='New summary' description='New description'",
    "<%= config.bin %> <%= command.id %> PROJ-123 --fields description='\n# Header\n## Sub-header\n- Item 1\n- Item 2\n```bash\nls -a\n```'",
    '<%= config.bin %> <%= command.id %> PROJ-123 --fields description="$(cat content.md)"',
    '<%= config.bin %> <%= command.id %> PROJ-123 --fields timetracking=\'{"originalEstimate": "5h"}\'',
    '<%= config.bin %> <%= command.id %> PROJ-123 --text-fields \'summary={"fix":"login"}\'',
  ]

  static override flags = {
    fields: Flags.string({
      description:
        'Issue fields to update in key=value format. Values starting with { or [ are parsed as JSON. At least one of --fields or --text-fields is required',
      multiple: true,
      required: false,
    }),
    profile: Flags.string({char: 'p', description: 'Authentication profile name', required: false}),
    'text-fields': Flags.string({
      description:
        'Issue fields to update in key=value format, sent as literal strings: the value is never JSON-parsed. Rich-text fields (description, ADF custom fields) are still converted from Markdown. A key may not appear in both --fields and --text-fields',
      multiple: true,
      required: false,
    }),
  }

  public async run(): Promise<ApiResult> {
    const {args, flags} = await this.parse(IssueUpdate)
    const {loadAuthConfig} = createProfileManager(this.config, flags.profile, 'jira-config.json')
    const auth = await loadAuthConfig()
    if (!auth) {
      this.error(`Missing authentication config.`)
    }

    const fields = parseKeyValuePairs(flags.fields)
    const textFields = parseKeyValuePairs(flags['text-fields'])

    if (Object.keys(fields).length === 0 && Object.keys(textFields).length === 0) {
      this.error('At least one of --fields or --text-fields is required')
    }

    const duplicateError = duplicateFieldsError(fields, textFields)
    if (duplicateError) {
      this.error(duplicateError)
    }

    const result = await updateIssue(auth, args.issueId, fields, textFields)
    clearClients()

    return result
  }
}
