import {createAuthUpdateCommand} from '@hesed/plugin-lib'

import {clearClients, testConnection} from '../../../jira/jira-client.js'

export default createAuthUpdateCommand({
  clearClients,
  configFile: 'jira-config.json',
  serviceName: 'Jira',
  testConnection,
})
