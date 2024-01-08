import {
  DEFAULT_PROFILE,
  getHomeDir,
  loadSharedConfigFiles,
} from '@smithy/shared-ini-file-loader';
import { fromIni } from '@aws-sdk/credential-providers';
import { EOL } from 'os';
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

/**
 * Options for the profile configuration.
 */
type ConfigProfileOptions = {
  profile: string;
  region: string;
};

/**
 * Options for the profile credential.
 */
type CredentialProfileOptions = {
  profile: string;
  accessKeyId: string;
  secretAccessKey: string;
};

/**
 * Options for the profile configuration and credential.
 */
export type ProfileOptions = ConfigProfileOptions & CredentialProfileOptions;

/**
 * Manages AWS profiles.
 */
export class ProfileController {
  /**
   * Return true if the provided profile exists in the aws config and/or credential file.
   */
  profileExists = async (profile: string): Promise<boolean> => {
    const profileData = await loadSharedConfigFiles({
      ignoreCache: true,
    });

    return (
      profileData.configFile?.[profile] !== undefined ||
      profileData.credentialsFile?.[profile] !== undefined
    );
  };

  /**
   * Appends a profile to AWS config and credential files.
   */
  createOrAppendAWSFiles = async (options: ProfileOptions) => {
    await this.createOrAppendAWSConfigFile(options);
    await this.createOrAppendAWSCredentialFile(options);
  };

  private createOrAppendAWSConfigFile = async (
    options: ConfigProfileOptions
  ) => {
    const filePath =
      process.env.AWS_CONFIG_FILE ?? path.join(getHomeDir(), '.aws', 'config');

    const dirName = path.dirname(filePath);
    if (!existsSync(dirName)) {
      await fs.mkdir(dirName, { recursive: true });
    }

    const fileEndsWithEOL = await this.isFileEndsWithEOL(filePath);
    let configData = fileEndsWithEOL ? '' : EOL;

    configData +=
      options.profile === DEFAULT_PROFILE
        ? `[${options.profile}]${EOL}`
        : `[profile ${options.profile}]${EOL}`;
    configData += `region = ${options.region}${EOL}`;

    await fs.appendFile(filePath, configData, { mode: '600' });

    // validate after write. It is to ensure this function is compatible with the current AWS format.
    const profileData = await loadSharedConfigFiles({
      ignoreCache: true,
    });
    const retrievedRegion = profileData.configFile?.[options.profile]?.region;
    if (retrievedRegion !== options.region) {
      throw new Error(`Failed to configure the AWS config file`);
    }
  };

  private createOrAppendAWSCredentialFile = async (
    options: CredentialProfileOptions
  ) => {
    const filePath =
      process.env.AWS_SHARED_CREDENTIALS_FILE ??
      path.join(getHomeDir(), '.aws', 'credentials');

    const dirName = path.dirname(filePath);
    if (!existsSync(dirName)) {
      await fs.mkdir(dirName, { recursive: true });
    }

    const fileEndsWithEOL = await this.isFileEndsWithEOL(filePath);
    let credentialData = fileEndsWithEOL ? '' : EOL;

    credentialData += `[${options.profile}]${EOL}`;
    credentialData += `aws_access_key_id = ${options.accessKeyId}${EOL}`;
    credentialData += `aws_secret_access_key = ${options.secretAccessKey}${EOL}`;

    await fs.appendFile(filePath, credentialData, { mode: '600' });

    // validate after write. It is to ensure this function is compatible with the current AWS format.
    const provider = fromIni({
      profile: options.profile,
      ignoreCache: true,
    });
    const retrievedCredentials = await provider();
    if (
      retrievedCredentials.accessKeyId !== options.accessKeyId ||
      retrievedCredentials.secretAccessKey !== options.secretAccessKey ||
      retrievedCredentials.sessionToken
    ) {
      throw new Error(`Failed to configure the AWS credentials file`);
    }
  };

  private isFileEndsWithEOL = async (filePath: string): Promise<boolean> => {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return data.length > 0 && data.slice(-EOL.length) === EOL;
    } catch (err) {
      const error = err as Error;
      if (error.message.includes('ENOENT')) {
        // file doesn't exists
        return true;
      }
      throw err;
    }
  };
}
