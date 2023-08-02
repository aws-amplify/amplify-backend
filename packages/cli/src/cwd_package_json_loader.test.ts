import { describe, it, mock } from 'node:test';
import { CwdPackageJsonLoader } from './cwd_package_json_loader.js';
import assert from 'node:assert';

describe('CwdPackageJsonLoader', () => {
  describe('loadCwdPackageJson', () => {
    it('throws error if package.json does not exist', async () => {
      const loader = new CwdPackageJsonLoader(
        {
          existsSync: mock.fn(() => false),
        } as never,
        { readFile: mock.fn(() => ({})) } as never
      );
      await assert.rejects(() => loader.loadCwdPackageJson());
    });
    it('throws error if contents are not valid json', async () => {
      const loader = new CwdPackageJsonLoader(
        {
          existsSync: mock.fn(() => true),
        } as never,
        { readFile: mock.fn(() => Promise.resolve('not valid json')) } as never
      );
      await assert.rejects(() => loader.loadCwdPackageJson());
    });
    it('throws error if contents do not pass validation', async () => {
      const loader = new CwdPackageJsonLoader(
        {
          existsSync: mock.fn(() => true),
        } as never,
        {
          readFile: mock.fn(() =>
            Promise.resolve({ invalidField: 'something' })
          ),
        } as never
      );
      await assert.rejects(() => loader.loadCwdPackageJson());
    });
    it('returns validated object', async () => {
      const validValue = { name: 'test-name' };
      const loader = new CwdPackageJsonLoader(
        {
          existsSync: mock.fn(() => true),
        } as never,
        {
          readFile: mock.fn(() => Promise.resolve(JSON.stringify(validValue))),
        } as never
      );
      const result = await loader.loadCwdPackageJson();
      assert.deepStrictEqual(result, validValue);
    });
  });
});
