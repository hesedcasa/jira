import {Args, Command, Flags} from '@oclif/core'

import {clearClients, getBoardIssuesForSprint} from '../../../agile/agile-client.js'
import {readConfig} from '../../../config.js'
import {formatAsToon} from '../../../format.js'

export default class BoardSprintIssues extends Command {
  /* eslint-disable perfectionist/sort-objects */
  static override args = {
    boardId: Args.integer({description: 'Board ID', required: true}),
    sprintId: Args.integer({description: 'Sprint ID', required: true}),
    jql: Args.string({description: 'JQL expression', required: false}),
  }
  static override description = 'Get all issues belong to the sprint from the board'
  static override examples = [
    '<%= config.bin %> <%= command.id %> 123 3068 \'summary ~ "Error saving file" AND status IN ("ready", "in progress")\'',
    '<%= config.bin %> <%= command.id %> 123 3068 \'assignee="john@email.com" AND type=Bug\' --max 5 --start 2',
    "<%= config.bin %> <%= command.id %> 123 3068 'timeestimate > 4h' --fields comment,creator,timeestimate",
  ]
  static override flags = {
    fields: Flags.string({description: 'Extra list of fields to return', required: false}),
    max: Flags.integer({description: 'Maximum number of items per page', required: false}),
    start: Flags.integer({description: 'Index of the first item to return', required: false}),
    toon: Flags.boolean({description: 'Format output as toon', required: false}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(BoardSprintIssues)
    const config = await readConfig(this.config.configDir, this.log.bind(this))
    if (!config) {
      return
    }

    const result = await getBoardIssuesForSprint(
      config.auth,
      args.boardId,
      args.sprintId,
      args.jql,
      flags.max,
      flags.start,
      flags.fields ? flags.fields.split(',') : undefined,
    )
    clearClients()

    if (flags.toon) {
      this.log(formatAsToon(result))
    } else {
      this.logJson(result)
    }
  }
}
