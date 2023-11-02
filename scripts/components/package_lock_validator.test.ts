import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PackageLockValidator } from './package_lock_validator.js';
import path from 'path';
import { fileURLToPath } from 'url';

const testResourcesPath = fileURLToPath(
  new URL('./test_resources', import.meta.url)
);

void describe('Package lock validator', () => {
  void it('does not throw when validating valid lock file', async () => {
    await new PackageLockValidator(
      path.join(testResourcesPath, 'package_lock_valid.json')
    ).validate();
    // no throw
  });

  void it('throws if file does not exist', async () => {
    await assert.rejects(
      () => new PackageLockValidator('this_path_does_not_exist').validate(),
      (err: Error) => {
        assert.ok(err.message.includes('no such file or directory'));
        return true;
      }
    );
  });

  void it('detects localhost in package lock', async () => {
    await assert.rejects(
      () =>
        new PackageLockValidator(
          path.join(testResourcesPath, 'package_lock_with_localhost.json')
        ).validate(),
      (err: Error) => {
        // There are two entries staged in 'package_lock_with_localhost.json' to test both conditions
        assert.ok(err.message.includes('.resolved property value'));
        assert.ok(err.message.includes('localhost'));
        assert.ok(err.message.includes('127.0.0.1'));
        return true;
      }
    );
  });
});
