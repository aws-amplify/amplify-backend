import path from 'node:path';
import { after, before, beforeEach, describe, it } from 'node:test';
import fs from 'fs/promises';
import { ProfileManager } from './profile_manager.js';
import assert from 'node:assert';
import { loadSharedConfigFiles } from '@smithy/shared-ini-file-loader';

const testAccessKeyId = 'testAccessKeyId';
const testSecretAccessKey = 'testSecretAccessKey';
const testProfile = 'testProfile';
const testRegion = 'us-east-1';

const testProfile2 = 'testProfile2';
const testSecretAccessKey2 = 'testSecretAccessKey2';
const testAccessKeyId2 = 'testAccessKeyId2';
const testRegion2 = 'eu-south-1';

void describe('profile manager', () => {
  let testDir: string;
  let configFilePath: string;
  let credFilePath: string;

  const profileManager = new ProfileManager();

  before(async () => {
    testDir = await fs.mkdtemp('amplify_cmd_test');
    configFilePath = path.join(process.cwd(), testDir, 'config');
    credFilePath = path.join(process.cwd(), testDir, 'credentials');

    process.env.AWS_CONFIG_FILE = configFilePath;
    process.env.AWS_SHARED_CREDENTIALS_FILE = credFilePath;
  });

  after(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    delete process.env.AWS_CONFIG_FILE;
    delete process.env.AWS_SHARED_CREDENTIALS_FILE;
  });

  void describe('config file', () => {
    before(async () => {
      await fs.rm(configFilePath, { force: true });
      await fs.rm(credFilePath, { force: true });
    });

    void it('creates a new config file', async () => {
      await profileManager.appendAWSConfigFile({
        profile: testProfile,
        region: testRegion,
      });

      const writtenData = await loadSharedConfigFiles({
        ignoreCache: true,
      });

      assert.deepStrictEqual(writtenData, {
        configFile: {
          testProfile: {
            region: testRegion,
          },
        },
        credentialsFile: {},
      });
    });

    void it('appends to a config file', async () => {
      await profileManager.appendAWSConfigFile({
        profile: testProfile2,
        region: testRegion2,
      });

      const writtenData = await loadSharedConfigFiles({
        ignoreCache: true,
      });

      assert.deepStrictEqual(writtenData, {
        configFile: {
          testProfile: {
            region: testRegion,
          },
          testProfile2: {
            region: testRegion2,
          },
        },
        credentialsFile: {},
      });
    });
  });

  void describe('credential file', () => {
    before(async () => {
      await fs.rm(configFilePath, { force: true });
      await fs.rm(credFilePath, { force: true });
    });

    void it('creates a new credential file', async () => {
      await profileManager.appendAWSCredentialFile({
        profile: testProfile,
        accessKeyId: testAccessKeyId,
        secretAccessKey: testSecretAccessKey,
      });

      const writtenData = await loadSharedConfigFiles({
        ignoreCache: true,
      });

      assert.deepStrictEqual(writtenData, {
        configFile: {},
        credentialsFile: {
          testProfile: {
            aws_access_key_id: testAccessKeyId,
            aws_secret_access_key: testSecretAccessKey,
          },
        },
      });
    });

    void it('appends to a credential file', async () => {
      await profileManager.appendAWSCredentialFile({
        profile: testProfile2,
        accessKeyId: testAccessKeyId2,
        secretAccessKey: testSecretAccessKey2,
      });

      const writtenData = await loadSharedConfigFiles({
        ignoreCache: true,
      });

      assert.deepStrictEqual(writtenData, {
        configFile: {},
        credentialsFile: {
          testProfile: {
            aws_access_key_id: testAccessKeyId,
            aws_secret_access_key: testSecretAccessKey,
          },
          testProfile2: {
            aws_access_key_id: testAccessKeyId2,
            aws_secret_access_key: testSecretAccessKey2,
          },
        },
      });
    });
  });

  void describe('profile exists', () => {
    beforeEach(async () => {
      await fs.rm(configFilePath, { force: true });
      await fs.rm(credFilePath, { force: true });
    });

    void it('returns false if absent both config and credential files', async () => {
      assert.equal(await profileManager.profileExists(testProfile), false);
    });

    void it('returns false if a profile does not exist in any files', async () => {
      await profileManager.appendAWSConfigFile({
        profile: testProfile2,
        region: testRegion2,
      });
      await profileManager.appendAWSConfigFile({
        profile: testProfile2,
        region: testRegion2,
      });
      assert.equal(await profileManager.profileExists(testProfile), false);
    });

    void it('returns true if a profile exists in a config file', async () => {
      await profileManager.appendAWSConfigFile({
        profile: testProfile,
        region: testRegion,
      });
      assert.equal(await profileManager.profileExists(testProfile), true);
    });

    void it('returns true if a profile exists in a credential file', async () => {
      await profileManager.appendAWSCredentialFile({
        profile: testProfile,
        accessKeyId: testAccessKeyId,
        secretAccessKey: testSecretAccessKey,
      });
      assert.equal(await profileManager.profileExists(testProfile), true);
    });

    void it('returns true if a profile exists in both config and credential files', async () => {
      await profileManager.appendAWSConfigFile({
        profile: testProfile,
        region: testRegion,
      });

      await profileManager.appendAWSCredentialFile({
        profile: testProfile,
        accessKeyId: testAccessKeyId,
        secretAccessKey: testSecretAccessKey,
      });
      assert.equal(await profileManager.profileExists(testProfile), true);
    });
  });
});
