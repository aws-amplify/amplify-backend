import { describe, it, mock } from 'node:test';
import { getInstallationUuid } from './get_installation_id.js';
import { v4, validate } from 'uuid';
import fs from 'fs';
import assert from 'node:assert';

void describe('LibraryVersionFetcher', () => {
  mock.method(fs, 'existsSync', () => true);
  mock.method(fs, 'readFile', () =>
    Promise.resolve(JSON.stringify({ name: 'testAppName' }))
  );

  void it('returns a valid UUID', () => {
    const installationUuid = getInstallationUuid();
    assert.ok(
      validate(installationUuid),
      `${installationUuid} is not a valid UUID string`
    );
  });

  void it('returns a consistent UUID for repeated calls', () => {
    const installationUuid = getInstallationUuid();
    assert.deepStrictEqual(installationUuid, getInstallationUuid());
  });

  void it('returns a different UUID for a different namespace', () => {
    const installationUuid = getInstallationUuid();
    assert.notDeepStrictEqual(installationUuid, getInstallationUuid(v4()));
  });
});
