import path from 'node:path';
import { after, before, beforeEach, describe, it } from 'node:test';
import fs from 'fs/promises';
import { ProfileController } from './profile_controller.js';
import assert from 'node:assert';
import { loadSharedConfigFiles } from '@smithy/shared-ini-file-loader';
import { EOL } from 'node:os';

const testAccessKeyId = 'testAccessKeyId';
const testSecretAccessKey = 'testSecretAccessKey';
const testProfile = 'testProfile';
const testRegion = 'us-east-1';
const expectedConfigText = `[profile ${testProfile}]${EOL}region = ${testRegion}${EOL}`;
const expectedCredentialText = `[${testProfile}]${EOL}aws_access_key_id = ${testAccessKeyId}${EOL}aws_secret_access_key = ${testSecretAccessKey}${EOL}`;

const testProfile2 = 'testProfile2';
const testSecretAccessKey2 = 'testSecretAccessKey2';
const testAccessKeyId2 = 'testAccessKeyId2';
const testRegion2 = 'eu-south-1';
const expectedConfigText2 = `[profile ${testProfile2}]${EOL}region = ${testRegion2}${EOL}`;
const expectedCredentialText2 = `[${testProfile2}]${EOL}aws_access_key_id = ${testAccessKeyId2}${EOL}aws_secret_access_key = ${testSecretAccessKey2}${EOL}`;

const testProfile3 = 'testProfile3';
const testSecretAccessKey3 = 'testSecretAccessKey3';
const testAccessKeyId3 = 'testAccessKeyId3';
const testRegion3 = 'eu-south-3';
const expectedConfigText3 = `[profile ${testProfile3}]${EOL}region = ${testRegion3}${EOL}`;
const expectedCredentialText3 = `[${testProfile3}]${EOL}aws_access_key_id = ${testAccessKeyId3}${EOL}aws_secret_access_key = ${testSecretAccessKey3}${EOL}`;

const removeLastEOLCharFromFile = async (filePath: string) => {
  const textData = await fs.readFile(filePath, 'utf-8');
  assert.equal(textData.slice(-EOL.length), EOL);
  const removeLastEOLData = textData.slice(0, -EOL.length);
  assert.notEqual(removeLastEOLData.slice(-EOL.length), EOL);
  await fs.writeFile(filePath, removeLastEOLData, 'utf-8');
};

void describe('profile controller', () => {
  let testDir: string;
  let configFilePath: string;
  let credFilePath: string;

  const profileController = new ProfileController();

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

  void describe('appendAWSFiles', () => {
    before(async () => {
      await fs.rm(configFilePath, { force: true });
      await fs.rm(credFilePath, { force: true });
    });

    void it('creates new files', async () => {
      await profileController.appendAWSFiles({
        profile: testProfile,
        region: testRegion,
        accessKeyId: testAccessKeyId,
        secretAccessKey: testSecretAccessKey,
      });

      const data = await loadSharedConfigFiles({
        ignoreCache: true,
      });

      assert.deepStrictEqual(data, {
        configFile: {
          testProfile: {
            region: testRegion,
          },
        },
        credentialsFile: {
          testProfile: {
            aws_access_key_id: testAccessKeyId,
            aws_secret_access_key: testSecretAccessKey,
          },
        },
      });

      const configText = await fs.readFile(
        process.env.AWS_CONFIG_FILE as string,
        'utf-8'
      );
      assert.equal(configText, expectedConfigText);

      const credentialText = await fs.readFile(
        process.env.AWS_SHARED_CREDENTIALS_FILE as string,
        'utf-8'
      );
      assert.equal(credentialText, expectedCredentialText);
    });

    void it('appends to files which ends with EOL', async () => {
      await profileController.appendAWSFiles({
        profile: testProfile2,
        region: testRegion2,
        accessKeyId: testAccessKeyId2,
        secretAccessKey: testSecretAccessKey2,
      });

      const configData = await loadSharedConfigFiles({
        ignoreCache: true,
      });

      assert.deepStrictEqual(configData, {
        configFile: {
          testProfile: {
            region: testRegion,
          },
          testProfile2: {
            region: testRegion2,
          },
        },
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

      const configText = await fs.readFile(
        process.env.AWS_CONFIG_FILE as string,
        'utf-8'
      );
      assert.equal(configText, `${expectedConfigText}${expectedConfigText2}`);

      const credentialText = await fs.readFile(
        process.env.AWS_SHARED_CREDENTIALS_FILE as string,
        'utf-8'
      );
      assert.equal(
        credentialText,
        `${expectedCredentialText}${expectedCredentialText2}`
      );
    });

    void it('appends to files which does not end with EOL', async () => {
      await removeLastEOLCharFromFile(process.env.AWS_CONFIG_FILE as string);
      await removeLastEOLCharFromFile(
        process.env.AWS_SHARED_CREDENTIALS_FILE as string
      );

      await profileController.appendAWSFiles({
        profile: testProfile3,
        region: testRegion3,
        accessKeyId: testAccessKeyId3,
        secretAccessKey: testSecretAccessKey3,
      });

      const configData = await loadSharedConfigFiles({
        ignoreCache: true,
      });

      assert.deepStrictEqual(configData, {
        configFile: {
          testProfile: {
            region: testRegion,
          },
          testProfile2: {
            region: testRegion2,
          },
          testProfile3: {
            region: testRegion3,
          },
        },
        credentialsFile: {
          testProfile: {
            aws_access_key_id: testAccessKeyId,
            aws_secret_access_key: testSecretAccessKey,
          },
          testProfile2: {
            aws_access_key_id: testAccessKeyId2,
            aws_secret_access_key: testSecretAccessKey2,
          },
          testProfile3: {
            aws_access_key_id: testAccessKeyId3,
            aws_secret_access_key: testSecretAccessKey3,
          },
        },
      });

      const configText = await fs.readFile(
        process.env.AWS_CONFIG_FILE as string,
        'utf-8'
      );
      assert.equal(
        configText,
        `${expectedConfigText}${expectedConfigText2}${expectedConfigText3}`
      );

      const credentialText = await fs.readFile(
        process.env.AWS_SHARED_CREDENTIALS_FILE as string,
        'utf-8'
      );
      assert.equal(
        credentialText,
        `${expectedCredentialText}${expectedCredentialText2}${expectedCredentialText3}`
      );
    });
  });

  void describe('profile exists', () => {
    beforeEach(async () => {
      await fs.rm(configFilePath, { force: true });
      await fs.rm(credFilePath, { force: true });
    });

    void it('returns false if absent both config and credential files', async () => {
      assert.equal(await profileController.profileExists(testProfile), false);
    });

    void it('returns false if a profile does not exist in any files', async () => {
      await fs.writeFile(
        process.env.AWS_CONFIG_FILE as string,
        expectedConfigText2,
        'utf-8'
      );
      await fs.writeFile(
        process.env.AWS_SHARED_CREDENTIALS_FILE as string,
        expectedCredentialText2,
        'utf-8'
      );
      assert.equal(await profileController.profileExists(testProfile), false);
    });

    void it('returns true if a profile exists in a config file', async () => {
      await fs.writeFile(
        process.env.AWS_CONFIG_FILE as string,
        expectedConfigText,
        'utf-8'
      );
      assert.equal(await profileController.profileExists(testProfile), true);
    });

    void it('returns true if a profile exists in a credential file', async () => {
      await fs.writeFile(
        process.env.AWS_SHARED_CREDENTIALS_FILE as string,
        expectedCredentialText,
        'utf-8'
      );
      assert.equal(await profileController.profileExists(testProfile), true);
    });

    void it('returns true if a profile exists in both config and credential files', async () => {
      await fs.writeFile(
        process.env.AWS_CONFIG_FILE as string,
        `${expectedConfigText}${expectedConfigText2}`,
        'utf-8'
      );
      await fs.writeFile(
        process.env.AWS_SHARED_CREDENTIALS_FILE as string,
        `${expectedCredentialText}${expectedCredentialText2}`,
        'utf-8'
      );
      assert.equal(await profileController.profileExists(testProfile), true);
    });
  });
});
