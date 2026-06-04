import {createAuthTestCommand} from '@hesed/plugin-lib'

import {clearClients, testConnection} from '../../../jira/jira-client.js'

export default createAuthTestCommand({
  clearClients,
  configFile: 'jira-config.json',
  serviceName: 'Jira',
  testConnection,
})
