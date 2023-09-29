import path from 'path';
import fs from 'fs/promises';
import { homedir } from 'os';
import * as ini from 'ini';
import _open from 'open';
import { regions } from './aws_regions.js';

const AWS_CREDENTIALS_FILE_NAME = 'credentials';
const CONFIG_FILE_NAME = 'config';
const AWS_DOT_DIRECTORY = '.aws';
const SECRET_FILE_MODE = 0o6_0_0;
// TODO: change it to the new docs before launch
const DOCS_URL =
  'https://docs.amplify.aws/cli/start/install/#configure-the-amplify-cli';

type IniCredentials = Record<
  string,
  {
    // eslint-disable-next-line
    aws_access_key_id: string;
    // eslint-disable-next-line
    aws_secret_access_key: string;
  }
>;

type IniConfig = Record<
  string,
  {
    region: string;
  }
>;

type ProfileSettings = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
};

const DEFAULT_PROFILE = 'default';

const getDotAWSDirPath = (): string =>
  path.normalize(path.join(homedir(), AWS_DOT_DIRECTORY));

const getAWSCredentialsFilePath = (): string =>
  process.env.AWS_SHARED_CREDENTIALS_FILE ||
  path.normalize(path.join(getDotAWSDirPath(), AWS_CREDENTIALS_FILE_NAME));

const getAWSConfigFilePath = (): string =>
  process.env.AWS_CONFIG_FILE ||
  path.normalize(path.join(getDotAWSDirPath(), CONFIG_FILE_NAME));

/**
 * A class for configure local aws profile
 */
class ProfileConfiguration {
  /**
   * constructor for ProfileConfiguration
   * @param open Injecting open 3P dependency in order to swap with a mockable counterpart
   */
  constructor(private readonly open = _open) {}
  /**
   * Opens docs site for setting up aws profile
   *
   */
  async openDocs() {
    await this.open(DOCS_URL);
  }

  /**
   * gets a list of AWS regions from a static file
   * @returns a list of AWS regions
   */
  getRegions() {
    return regions;
  }

  /**
   * Configures local aws profile
   * @param param0 An object containing accessKeyId, secretAccessKey and region
   * @param param0.accessKeyId Access key id of the credentials pair
   * @param param0.secretAccessKey Secret access key of the credentials pair
   * @param param0.region AWS region
   */
  async configure({ accessKeyId, secretAccessKey, region }: ProfileSettings) {
    let credentials: IniCredentials = {};
    let config: IniConfig = {};

    const awsCredentialsFilePath = getAWSCredentialsFilePath();
    try {
      const credentialsFileContents = await fs.readFile(
        awsCredentialsFilePath,
        'utf-8'
      );
      credentials = ini.parse(credentialsFileContents);
    } catch (e) {
      // if file does not exist we swallow
    }

    const awsConfigFilesPath = getAWSConfigFilePath();
    try {
      const configFileContents = await fs.readFile(awsConfigFilesPath, 'utf-8');
      config = ini.parse(configFileContents);
    } catch (e) {
      // if file does not exist we swallow
    }

    credentials[DEFAULT_PROFILE] = {
      aws_access_key_id: accessKeyId,
      aws_secret_access_key: secretAccessKey,
    };

    config[DEFAULT_PROFILE] = {
      region,
    };

    await fs.writeFile(awsCredentialsFilePath, ini.stringify(credentials), {
      mode: SECRET_FILE_MODE,
    });
    await fs.writeFile(awsConfigFilesPath, ini.stringify(config), {
      mode: SECRET_FILE_MODE,
    });
    // eslint-disable-next-line
    console.log('Successfully configured the profile.');
  }
}

export { ProfileConfiguration };
