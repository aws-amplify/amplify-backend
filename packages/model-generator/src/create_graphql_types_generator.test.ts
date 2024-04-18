import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createGraphqlTypesGenerator } from './create_graphql_types_generator.js';
import {
  AWSClientProvider,
  BackendIdentifier,
} from '@aws-amplify/plugin-types';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';

void describe('types generator factory', () => {
  void it('throws an error if a null backendIdentifier is passed in', async () => {
    assert.throws(() =>
      createGraphqlTypesGenerator({
        backendIdentifier: null as unknown as BackendIdentifier,
        awsClientProvider: null as unknown as AWSClientProvider<{
          getAmplifyClient: AmplifyClient;
          getCloudFormationClient: CloudFormationClient;
        }>,
      })
    );
  });

  void it('throws an error if a null backendIdentifier is passed in', async () => {
    assert.throws(() =>
      createGraphqlTypesGenerator({
        backendIdentifier: { stackName: 'foo' },
        awsClientProvider: null as unknown as AWSClientProvider<{
          getAmplifyClient: AmplifyClient;
          getCloudFormationClient: CloudFormationClient;
        }>,
      })
    );
  });
});
