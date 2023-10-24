import { describe, it, mock } from 'node:test';
import { PackageJsonReader } from './package_json_reader.js';
import assert from 'assert';

void describe('Package JSON reader', () => {
  void it('Can read package json', async () => {
    const readFileMock = mock.fn<(arg0: string) => Promise<Buffer>>(() =>
      Promise.resolve(
        Buffer.from(
          `
        {
         "name": "test_name",
         "version": "test_version",
         "type": "module"
        }
      `,
          'utf-8'
        )
      )
    );
    const packageJsonReader = new PackageJsonReader(readFileMock as never);
    const testPath = 'test_path';
    const packageJson = await packageJsonReader.readPackageJson(testPath);
    assert.strictEqual(packageJson.name, 'test_name');
    assert.strictEqual(packageJson.version, 'test_version');
    assert.strictEqual(packageJson.type, 'module');
    assert.strictEqual(1, readFileMock.mock.callCount());
    assert.ok(readFileMock.mock.calls[0].arguments[0].endsWith('package.json'));
  });
});
