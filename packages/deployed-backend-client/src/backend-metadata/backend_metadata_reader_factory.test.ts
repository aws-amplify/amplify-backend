import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import { BackendMetadataReaderFactory } from './backend_metadata_reader_factory.js';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';

void describe('BackendMetadataReaderFactory', () => {
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
    const instance1 = await BackendMetadataReaderFactory.getInstance(
      credentials
    );
    const instance2 = await BackendMetadataReaderFactory.getInstance(
      credentials
    );
    assert.equal(instance1, instance2);
  });
});
