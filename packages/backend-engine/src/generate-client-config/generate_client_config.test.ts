import { describe, it } from 'node:test';
import { fromIni } from '@aws-sdk/credential-providers';
import { generateClientConfig } from './generate_client_config.js';

describe('generateClientConfig', () => {
  // TODO remove this
  it.skip('gets output from stack', async () => {
    await generateClientConfig(fromIni(), {
      projectName: 'samsaraDemo',
      environmentName: 'foyleefSandbox',
    });
  });
});
