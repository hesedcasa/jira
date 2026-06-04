import {createAuthAddCommand} from '@hesed/plugin-lib'

import {clearClients, testConnection} from '../../../jira/jira-client.js'

export default createAuthAddCommand({
  clearClients,
  configFile: 'jira-config.json',
  serviceName: 'Jira',
  testConnection,
})
