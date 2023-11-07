import assert from 'node:assert';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import { CommandMiddleware } from './command_middleware.js';
import { EOL } from 'node:os';
import { DEFAULT_PROFILE } from '@smithy/shared-ini-file-loader';
import fs from 'fs/promises';
import path from 'path';
import { ArgumentsCamelCase } from 'yargs';

void describe('commandMiddleware', () => {
  void describe('profile', () => {
    const commandMiddleware = new CommandMiddleware();
    const testAccessKeyId = '124';
    const testSecretAccessKey = '667';
    const testProfile = 'profileA';

    void describe('from environment variables', () => {
      beforeEach(() => {
        process.env.AWS_ACCESS_KEY_ID = testAccessKeyId;
        process.env.AWS_SECRET_ACCESS_KEY = testSecretAccessKey;
      });

      afterEach(() => {
        delete process.env.AWS_ACCESS_KEY_ID;
        delete process.env.AWS_SECRET_ACCESS_KEY;
        delete process.env.AWS_PROFILE;
      });

      void it('loads credentials', async () => {
        await assert.doesNotReject(() =>
          commandMiddleware.ensureAwsCredentials(
            {} as ArgumentsCamelCase<{ profile: string | undefined }>
          )
        );
      });

      void it('throws error if a profile is provided and no other credential providers', async () => {
        try {
          await commandMiddleware.ensureAwsCredentials({
            profile: testProfile,
          } as ArgumentsCamelCase<{ profile: string | undefined }>);
          assert.fail('expect to throw error');
        } catch (err) {
          assert.match(
            (err as Error).message,
            /Failed to load aws credentials for profile/
          );
        }
      });
    });

    void describe('from ini file', () => {
      let testDir: string;
      let credFilePath: string;

      before(async () => {
        testDir = await fs.mkdtemp('profile_middleware_test');
        credFilePath = path.join(process.cwd(), testDir, 'credentials');
        process.env.AWS_SHARED_CREDENTIALS_FILE = credFilePath;
      });

      after(async () => {
        await fs.rm(testDir, { recursive: true, force: true });
        delete process.env.AWS_SHARED_CREDENTIALS_FILE;
        delete process.env.AWS_PROFILE;
      });

      void it('throws if missing default profile when no profile input', async () => {
        try {
          await commandMiddleware.ensureAwsCredentials(
            {} as ArgumentsCamelCase<{ profile: string | undefined }>
          );
          assert.fail('expect to throw error');
        } catch (err) {
          assert.match(
            (err as Error).message,
            /Failed to load default aws credentials/
          );
        }
      });

      void it('loads default profile when no profile input', async () => {
        const defaultCredData = `[${DEFAULT_PROFILE}]${EOL}aws_access_key_id = 12${EOL}aws_secret_access_key = 23${EOL}`;
        await fs.writeFile(credFilePath, defaultCredData, 'utf-8');
        await assert.doesNotReject(() =>
          commandMiddleware.ensureAwsCredentials(
            {} as ArgumentsCamelCase<{ profile: string | undefined }>
          )
        );
      });

      void it('throws error if an input profile does not exist in a credential file', async () => {
        try {
          await commandMiddleware.ensureAwsCredentials({
            profile: 'someInvalidProfile',
          } as ArgumentsCamelCase<{ profile: string | undefined }>);
          assert.fail('expect to throw error');
        } catch (err) {
          assert.match(
            (err as Error).message,
            /Failed to load aws credentials for profile/
          );
        }
      });

      void it('loads a specific profile', async () => {
        const testProfileCredData = `[${testProfile}]${EOL}aws_access_key_id = 77${EOL}aws_secret_access_key = 88${EOL}`;
        await fs.writeFile(credFilePath, testProfileCredData, 'utf-8');

        await assert.doesNotReject(() =>
          commandMiddleware.ensureAwsCredentials({
            profile: testProfile,
          } as ArgumentsCamelCase<{ profile: string | undefined }>)
        );
      });
    });
  });
});
