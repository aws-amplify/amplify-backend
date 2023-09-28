import { describe, it, mock } from 'node:test';
import { PackageJsonFileLoader } from './package_json_loader.js';
import assert from 'node:assert';

void describe('CwdPackageJsonLoader', () => {
  void describe('loadCwdPackageJson', () => {
    void it('throws error if package.json does not exist', async () => {
      const loader = new PackageJsonFileLoader(
        {
          existsSync: mock.fn(() => false),
        } as never,
        { readFile: mock.fn(() => ({})) } as never
      );
      await assert.rejects(() => loader.loadPackageJson());
    });
    void it('throws error if contents are not valid json', async () => {
      const loader = new PackageJsonFileLoader(
        {
          existsSync: mock.fn(() => true),
        } as never,
        { readFile: mock.fn(() => Promise.resolve('not valid json')) } as never
      );
      await assert.rejects(() => loader.loadPackageJson());
    });
    void it('throws error if contents do not pass validation', async () => {
      const loader = new PackageJsonFileLoader(
        {
          existsSync: mock.fn(() => true),
        } as never,
        {
          readFile: mock.fn(() =>
            Promise.resolve({ invalidField: 'something' })
          ),
        } as never
      );
      await assert.rejects(() => loader.loadPackageJson());
    });
    void it('returns validated object', async () => {
      const validValue = { name: 'test-name', version: '0.289.29' };
      const loader = new PackageJsonFileLoader(
        {
          existsSync: mock.fn(() => true),
        } as never,
        {
          readFile: mock.fn(() => Promise.resolve(JSON.stringify(validValue))),
        } as never
      );
      const result = await loader.loadPackageJson();
      assert.deepStrictEqual(result, validValue);
    });
  });
});
