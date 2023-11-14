import { describe, it, mock } from 'node:test';
import { LibraryVersionFetcher } from './library_version_fetcher.js';
import fs from 'fs';
import assert from 'node:assert';

void describe('LibraryVersionFetcher', () => {
  const libraryVersionFetcher = new LibraryVersionFetcher();
  const fsExistsSyncMock = mock.method(fs, 'existsSync', () => true);
  const fsReadFileSync = mock.method(fs, 'readFileSync', () =>
    JSON.stringify({ version: '12.13.14' })
  );

  void it('throws if provided package json file cannot be found', () => {
    fsExistsSyncMock.mock.mockImplementationOnce(() => false);
    assert.throws(() => libraryVersionFetcher.fetch('some/path'), {
      message: 'Could not find some/path to load library version from',
    });
  });

  void it('throws if provided package json file does not contain a version field', () => {
    fsReadFileSync.mock.mockImplementationOnce(() =>
      JSON.stringify({ invalid: 'value' })
    );
    assert.throws(() => libraryVersionFetcher.fetch('some/path'), {
      message: 'Could not parse library version from some/path',
    });
  });
});
