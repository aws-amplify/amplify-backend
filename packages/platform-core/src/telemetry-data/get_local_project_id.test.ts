import { describe, it, mock } from 'node:test';
import { v4, validate } from 'uuid';
import fs from 'fs';
import assert from 'node:assert';
import { getLocalProjectUuid } from './get_local_project_id';

void describe('LibraryVersionFetcher', () => {
  mock.method(fs, 'existsSync', () => true);
  mock.method(fs, 'readFile', () =>
    Promise.resolve(JSON.stringify({ name: 'testAppName' }))
  );

  void it('returns a valid UUID', () => {
    const installationUuid = getLocalProjectUuid();
    assert.ok(
      validate(installationUuid),
      `${installationUuid} is not a valid UUID string`
    );
  });

  void it('returns a consistent UUID for repeated calls', () => {
    const installationUuid = getLocalProjectUuid();
    assert.deepStrictEqual(installationUuid, getLocalProjectUuid());
  });

  void it('returns a different UUID for a different namespace', () => {
    const installationUuid = getLocalProjectUuid();
    assert.notDeepStrictEqual(installationUuid, getLocalProjectUuid(v4()));
  });
});
