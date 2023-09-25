import { describe, it } from 'node:test';
import assert from 'node:assert';
import { BackendMetadataReaderFactory } from './backend_metadata_reader_factory.js';

describe('BackendMetadataReaderFactory', () => {
  it('instance', async () => {
    const instance1 = BackendMetadataReaderFactory.getInstance();
    const instance2 = BackendMetadataReaderFactory.getInstance();
    assert.equal(instance1, instance2);
  });
});
