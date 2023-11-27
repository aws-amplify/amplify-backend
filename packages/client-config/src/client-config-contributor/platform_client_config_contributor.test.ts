import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PlatformClientConfigContributor } from './platform_client_config_contributor.js';
import {
  graphqlOutputKey,
  platformOutputKey,
} from '@aws-amplify/backend-output-schemas';

void describe('PlatformClientConfigContributor', () => {
  void it('returns an empty object if output has no platform output', () => {
    const contributor = new PlatformClientConfigContributor();
    assert.deepStrictEqual(
      contributor.contribute({
        [graphqlOutputKey]: {
          version: '1',
          payload: {
            awsAppsyncApiEndpoint: 'testApiEndpoint',
            awsAppsyncRegion: 'us-east-1',
            awsAppsyncAuthenticationType: 'API_KEY',
            awsAppsyncAdditionalAuthenticationTypes: 'API_KEY',
            awsAppsyncApiKey: 'testApiKey',
            awsAppsyncApiId: 'testApiId',
            amplifyApiModelSchemaS3Uri: 'testApiSchemaUri',
          },
        },
      }),
      {}
    );
  });

  void it('returns translated config when output has platform', () => {
    const contributor = new PlatformClientConfigContributor();
    assert.deepStrictEqual(
      contributor.contribute({
        [platformOutputKey]: {
          version: '1',
          payload: {
            deploymentType: 'branch',
            region: 'us-east-1',
          },
        },
      }),
      {
        aws_project_region: 'us-east-1',
      }
    );
  });
});
