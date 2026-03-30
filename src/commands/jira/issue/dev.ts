import {Args, Command, Flags} from '@oclif/core'

import {readConfig} from '../../../config.js'
import {formatAsToon} from '../../../format.js'
import {clearClients, getIssueDevelopment} from '../../../jira/jira-client.js'

export default class IssueDev extends Command {
  static override args = {
    issueId: Args.string({description: 'Issue ID', required: true}),
  }
  static override description = 'Get development detail for an issue'
  static override examples = [
    '<%= config.bin %> <%= command.id %> 12345 --application-type bitbucket --data-type repository',
  ]
  static override flags = {
    'application-type': Flags.string({
      default: 'bitbucket',
      description: 'Application type (e.g. bitbucket, github)',
      required: false,
    }),
    'data-type': Flags.string({
      default: 'pullrequest',
      description: 'Data type (e.g. repository, branch, commit, pullrequest)',
      required: false,
    }),
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(IssueDev)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) {
      return
    }

    const result = await getIssueDevelopment(config.auth, args.issueId, flags['application-type'], flags['data-type'])
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
