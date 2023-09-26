import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import { BackendMetadataManagerFactory } from './backend_metadata_manager_factory.js';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';

void describe('BackendMetadataManagerFactory', () => {
  let credentials: AwsCredentialIdentityProvider;
  beforeEach(() => {
    credentials = async () => ({
      accessKeyId: 'test',
      secretAccessKey: 'test',
    });
  });

  afterEach(async () => {
    await credentials();
  });

  void it('instance', async () => {
    const instance1 = await BackendMetadataManagerFactory.getInstance(
      credentials
    );
    const instance2 = await BackendMetadataManagerFactory.getInstance(
      credentials
    );
    assert.equal(instance1, instance2);
  });
});
