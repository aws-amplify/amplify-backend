import { describe, it } from 'node:test';
import assert from 'node:assert';
import { BackendMetadataReaderFactory } from './backend_metadata_reader_factory.js';
const credentials = async () => ({
  accessKeyId: 'test',
  secretAccessKey: 'test',
});

describe('BackendMetadataReaderFactory', () => {
  it('instance', async () => {
    const instance1 = await BackendMetadataReaderFactory.getInstance(
      credentials
    );
    const instance2 = await BackendMetadataReaderFactory.getInstance(
      credentials
    );
    assert.equal(instance1, instance2);
  });
});
