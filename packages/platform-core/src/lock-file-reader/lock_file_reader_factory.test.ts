import assert from 'assert';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { NpmLockFileReader } from './npm_lock_file_reader';
import { PnpmLockFileReader } from './pnpm_lock_file_reader';
import { YarnClassicLockFileReader } from './yarn_classic_lock_file_reader';
import { YarnModernLockFileReader } from './yarn_modern_lock_file_reader';
import { LockFileReaderFactory } from './lock_file_reader_factory';

void describe('LockFileReaderFactory', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  void describe('getLockFileReader', () => {
    const testCases = [
      {
        name: 'npm',
        userAgent: 'npm/7.0.0 node/v15.0.0 darwin x64',
        expectedInstanceOf: NpmLockFileReader,
      },
      {
        name: 'pnpm',
        userAgent: 'pnpm/5.0.0 node/v15.0.0 darwin x64',
        expectedInstanceOf: PnpmLockFileReader,
      },
      {
        name: 'yarn classic',
        userAgent: 'yarn/1.22.21 node/v15.0.0 darwin x64',
        expectedInstanceOf: YarnClassicLockFileReader,
      },
      {
        name: 'yarn modern',
        userAgent: 'yarn/4.0.1 node/v15.0.0 darwin x64',
        expectedInstanceOf: YarnModernLockFileReader,
      },
    ];

    for (const testCase of testCases) {
      void it(`should return the correct lock file reader for ${testCase.name}`, () => {
        process.env.npm_config_user_agent = testCase.userAgent;
        const lockFileReader = new LockFileReaderFactory().getLockFileReader();
        assert.ok(lockFileReader instanceof testCase.expectedInstanceOf);
      });
    }

    void it('should throw an error for unsupport package managers', () => {
      process.env.npm_config_user_agent =
        'unsupported/1.0.0 node/v15.0.0 darwin x64';
      assert.throws(() => new LockFileReaderFactory().getLockFileReader(), {
        message: 'Package Manager unsupported is not supported.',
      });
    });

    void it('should throw an error for pnpm on Windows', () => {
      process.env.npm_config_user_agent = 'pnpm/1.0.0 node/v15.0.0 darwin x64';
      assert.throws(
        () => new LockFileReaderFactory('win32').getLockFileReader(),
        {
          message: 'Amplify does not support PNPM on Windows.',
          details:
            'Details: https://github.com/aws-amplify/amplify-backend/blob/main/packages/create-amplify/README.md',
        }
      );
    });
  });
});
