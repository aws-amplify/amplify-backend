import { describe, it, mock } from 'node:test';
import { PackageJsonReader } from './package_json_reader.js';
import fs from 'fs';
import assert from 'assert';

void describe('Package JSON reader', () => {
  const fsExistsSyncMock = mock.method(fs, 'existsSync', () => true);
  const fsReadFileSync = mock.method(fs, 'readFileSync', () =>
    JSON.stringify({ name: 'test_name', version: '12.13.14', type: 'module' })
  );
  const testPath = '/test_path';
  const packageJsonReader = new PackageJsonReader();
  void it('can read package json', async () => {
    const packageJson = packageJsonReader.read(testPath);
    assert.strictEqual(packageJson.name, 'test_name');
    assert.strictEqual(packageJson.version, '12.13.14');
    assert.strictEqual(packageJson.type, 'module');
    assert.strictEqual(1, fsReadFileSync.mock.callCount());
  });

  void it('throws when package json is not present', async () => {
    fsExistsSyncMock.mock.mockImplementationOnce(() => false);
    assert.throws(() => packageJsonReader.read(testPath), {
      message: 'Could not find a package.json file at /test_path',
    });
  });

  void it('throws when package json is not parse-able', async () => {
    fsReadFileSync.mock.mockImplementationOnce(() => 'not json content');
    assert.throws(() => packageJsonReader.read(testPath), {
      message: 'Could not JSON.parse the contents of /test_path',
    });
  });
});
