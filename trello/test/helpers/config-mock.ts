import {Config} from '@oclif/core'

export function createMockConfig(): Config {
  return {
    bin: 'trello',
    configDir: '/tmp/test-config',
    runHook: async () => ({failures: [], successes: []}),
  } as unknown as Config
}
