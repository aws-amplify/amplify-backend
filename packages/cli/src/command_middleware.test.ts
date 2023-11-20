import assert from 'node:assert';
import { after, before, beforeEach, describe, it } from 'node:test';
import { CommandMiddleware } from './command_middleware.js';
import { EOL } from 'node:os';
import { DEFAULT_PROFILE } from '@smithy/shared-ini-file-loader';
import fs from 'fs/promises';
import path from 'path';
import { type ArgumentsCamelCase } from 'yargs';

const restoreEnv = (restoreVal: string | undefined, envVar: string) => {
  if (restoreVal) {
    process.env[envVar] = restoreVal;
    return;
  }
  delete process.env[envVar];
};

void describe('commandMiddleware', () => {
  void describe('ensureAwsCredentialAndRegion', () => {
    const commandMiddleware = new CommandMiddleware();
    const testAccessKeyId = '124';
    const testSecretAccessKey = '667';
    const testProfile = 'profileA';
    const testRegion = 'testRegion';

    let testDir: string;
    let credFilePath: string;
    let configFilePath: string;

    const currentProfile = process.env.AWS_PROFILE;
    const currentConfigFile = process.env.AWS_CONFIG_FILE;
    const currentCredentialFile = process.env.AWS_SHARED_CREDENTIALS_FILE;
    const currentAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const currentSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const currentRegion = process.env.AWS_REGION;

    before(async () => {
      testDir = await fs.mkdtemp('profile_middleware_test');
      credFilePath = path.join(process.cwd(), testDir, 'credentials');
      configFilePath = path.join(process.cwd(), testDir, 'config');
      process.env.AWS_SHARED_CREDENTIALS_FILE = credFilePath;
      process.env.AWS_CONFIG_FILE = configFilePath;
    });

    after(async () => {
      await fs.rm(testDir, { recursive: true, force: true });
      restoreEnv(currentProfile, 'AWS_PROFILE');
      restoreEnv(currentConfigFile, 'AWS_CONFIG_FILE');
      restoreEnv(currentCredentialFile, 'AWS_SHARED_CREDENTIALS_FILE');
      restoreEnv(currentAccessKeyId, 'AWS_ACCESS_KEY_ID');
      restoreEnv(currentSecretAccessKey, 'AWS_SECRET_ACCESS_KEY');
      restoreEnv(currentRegion, 'AWS_REGION');
    });

    void describe('from environment variables', () => {
      beforeEach(() => {
        process.env.AWS_ACCESS_KEY_ID = testAccessKeyId;
        process.env.AWS_SECRET_ACCESS_KEY = testSecretAccessKey;
        process.env.AWS_REGION = testRegion;
        delete process.env.AWS_PROFILE;
      });

      void it('loads credentials', async () => {
        await assert.doesNotReject(() =>
          commandMiddleware.ensureAwsCredentialAndRegion(
            {} as ArgumentsCamelCase<{ profile: string | undefined }>
          )
        );
      });

      void it('throws error if absent region environment variable', async () => {
        delete process.env.AWS_REGION;
        try {
          await commandMiddleware.ensureAwsCredentialAndRegion(
            {} as ArgumentsCamelCase<{ profile: string | undefined }>
          );
          assert.fail('expect to throw error');
        } catch (err) {
          assert.match(
            (err as Error).message,
            /Failed to load default aws region/
          );
        }
      });

      void it('throws error if a profile is provided and no other credential providers', async () => {
        try {
          await commandMiddleware.ensureAwsCredentialAndRegion({
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
      before(() => {
        delete process.env.AWS_ACCESS_KEY_ID;
        delete process.env.AWS_SECRET_ACCESS_KEY;
        delete process.env.AWS_REGION;
      });

      beforeEach(async () => {
        // clear files
        await fs.writeFile(credFilePath, '', 'utf-8');
        await fs.writeFile(configFilePath, '', 'utf-8');
        delete process.env.AWS_PROFILE;
      });

      const writeProfileCredential = async (
        profile: string = DEFAULT_PROFILE
      ) => {
        const credData = `[${profile}]${EOL}aws_access_key_id = 12${EOL}aws_secret_access_key = 23${EOL}`;
        await fs.writeFile(credFilePath, credData, 'utf-8');
      };

      const writeProfileRegion = async (profile: string = DEFAULT_PROFILE) => {
        let configData =
          profile == DEFAULT_PROFILE ? `[${profile}]` : `[profile ${profile}]`;
        configData += `${EOL}region = ${testRegion}${EOL}`;
        await fs.writeFile(configFilePath, configData, 'utf-8');
      };

      void it('throws if missing default credentials when no profile input', async () => {
        await writeProfileRegion();
        try {
          await commandMiddleware.ensureAwsCredentialAndRegion(
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

      void it('throws if missing the default region when no profile input', async () => {
        await writeProfileCredential();

        try {
          await commandMiddleware.ensureAwsCredentialAndRegion(
            {} as ArgumentsCamelCase<{ profile: string | undefined }>
          );
          assert.fail('expect to throw error');
        } catch (err) {
          assert.match(
            (err as Error).message,
            /Failed to load default aws region/
          );
        }
      });

      void it('loads default profile when no profile input', async () => {
        await writeProfileCredential();
        await writeProfileRegion();
        await assert.doesNotReject(() =>
          commandMiddleware.ensureAwsCredentialAndRegion(
            {} as ArgumentsCamelCase<{ profile: string | undefined }>
          )
        );
      });

      void it('throws error if missing credentials of the input profile', async () => {
        await writeProfileRegion(testProfile);
        try {
          await commandMiddleware.ensureAwsCredentialAndRegion({
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

      void it('throws error if missing a region of the input profile', async () => {
        await writeProfileCredential(testProfile);

        try {
          await commandMiddleware.ensureAwsCredentialAndRegion({
            profile: testProfile,
          } as ArgumentsCamelCase<{ profile: string | undefined }>);
          assert.fail('expect to throw error');
        } catch (err) {
          assert.match(
            (err as Error).message,
            /Failed to load aws region for profile/
          );
        }
      });

      void it('loads a specific profile', async () => {
        await writeProfileRegion(testProfile);
        await writeProfileCredential(testProfile);

        await assert.doesNotReject(() =>
          commandMiddleware.ensureAwsCredentialAndRegion({
            profile: testProfile,
          } as ArgumentsCamelCase<{ profile: string | undefined }>)
        );
      });
    });
  });
});
