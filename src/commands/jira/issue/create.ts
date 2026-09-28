import {type ApiResult, createProfileManager, formatAsToon} from '@hesed/plugin-lib'
import {Flags} from '@oclif/core'

import {BaseCommand} from '../../../base-command.js'
import {clearClients, createIssue} from '../../../jira/jira-client.js'
import {duplicateFieldsError, parseKeyValuePairs} from '../../../utils.js'

export default class IssueCreate extends BaseCommand {
  static override args = {}
  static override description = 'Create a new issue'
  static override examples = [
    '<%= config.bin %> <%= command.id %> --fields project=\'{"key":"PROJ"}\' summary="New summary" description="New description" issuetype=\'{"name":"Dev Task"}\'',
    '<%= config.bin %> <%= command.id %> --fields project=\'{"key":"PROJ"}\' summary="New summary" timetracking=\'{"originalEstimate": "5h"}\' issuetype=\'{"name":"Task"}\' description=\'\n# Header\n## Sub-header\n- Item 1\n- Item 2\n```bash\nls -a\n```\'',
    '<%= config.bin %> <%= command.id %> --fields project=\'{"key":"PROJ"}\' issuetype=\'{"name":"Task"}\' --text-fields \'summary=[1, 2] is a list\' \'description=[1, 2]\'',
  ]

  static override flags = {
    fields: Flags.string({
      description:
        'Minimum fields required (from --fields or --text-fields): project, summary, description & issuetype. Values starting with { or [ are parsed as JSON',
      multiple: true,
      required: false,
      summary: 'Issue fields in key=value format',
    }),
    profile: Flags.string({char: 'p', description: 'Authentication profile name', required: false}),
    'text-fields': Flags.string({
      description:
        'Like --fields, but the value is never JSON-parsed. A description is still converted from Markdown. A key may not appear in both --fields and --text-fields',
      multiple: true,
      required: false,
      summary: 'Issue fields in key=value format, sent as literal strings',
    }),
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<ApiResult> {
    const {flags} = await this.parse(IssueCreate)
    const {loadAuthConfig} = createProfileManager(this.config, flags.profile, 'jira-config.json')
    const auth = await loadAuthConfig()
    if (!auth) {
      this.error(`Missing authentication config.`)
    }

    const fields = parseKeyValuePairs(flags.fields)
    const textFields = parseKeyValuePairs(flags['text-fields'])

    const duplicateError = duplicateFieldsError(fields, textFields)
    if (duplicateError) {
      this.error(duplicateError)
    }

    const requiredFields = ['project', 'summary', 'description', 'issuetype']
    for (const required of requiredFields) {
      if (!(required in fields) && !(required in textFields)) {
        this.error(`Required field "${required}" is missing`)
      }
    }

    const result = await createIssue(auth, fields, textFields)
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    }

    return result
  }
}
