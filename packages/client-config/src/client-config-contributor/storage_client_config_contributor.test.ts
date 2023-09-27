import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StorageClientConfigContributor } from './storage_client_config_contributor.js';
import {
  graphqlOutputKey,
  storageOutputKey,
} from '@aws-amplify/backend-output-schemas';

void describe('StorageClientConfigContributor', () => {
  void it('returns an empty object if output has no storage output', () => {
    const contributor = new StorageClientConfigContributor();
    assert.deepStrictEqual(
      contributor.contribute({
        [graphqlOutputKey]: {
          version: '1',
          payload: {
            awsAppsyncApiEndpoint: 'stuff',
            awsAppsyncRegion: 'us-east-1',
            awsAppsyncAuthenticationType: 'API_KEY',
            awsAppsyncApiId: 'testApiId',
            amplifyApiModelSchemaS3Uri: 'testApiSchemaUri',
          },
        },
      }),
      {}
    );
  });

  void it('returns translated config when output has storage', () => {
    const contributor = new StorageClientConfigContributor();
    assert.deepStrictEqual(
      contributor.contribute({
        [storageOutputKey]: {
          version: '1',
          payload: {
            bucketName: 'testBucketName',
            storageRegion: 'testRegion',
          },
        },
      }),
      {
        aws_user_files_s3_bucket: 'testBucketName',
        aws_user_files_s3_bucket_region: 'testRegion',
      }
    );
  });
});
