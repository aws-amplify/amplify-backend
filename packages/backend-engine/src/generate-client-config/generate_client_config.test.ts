import { describe, it } from 'node:test';
import { fromIni } from '@aws-sdk/credential-providers';
import { generateClientConfig } from './generate_client_config.js';
import { ProjectEnvironmentIdentifier } from '@aws-amplify/primitives';

describe('generateClientConfig', () => {
  // TODO remove this
  it.skip('gets output from stack', async () => {
    await generateClientConfig(
      fromIni(),
      new ProjectEnvironmentIdentifier('samsaraDemo', 'foyleefSandbox')
    );
  });
});
