import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StorageClientConfigContributor } from './storage_client_config_contributor.js';

describe('StorageClientConfigContributor', () => {
  it('returns an empty object if output has no storage output', () => {
    const contributor = new StorageClientConfigContributor();
    assert.deepStrictEqual(
      contributor.contribute({
        dataOutput: {
          version: '1',
          payload: {
            appSyncApiEndpoint: 'stuff',
          },
        },
      }),
      {}
    );
  });

  it('returns translated config when output has storage', () => {
    const contributor = new StorageClientConfigContributor();
    assert.deepStrictEqual(
      contributor.contribute({
        storageOutput: {
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
