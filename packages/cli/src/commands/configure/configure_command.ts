import { Argv, CommandModule } from 'yargs';
import { AmplifyPrompter } from '@aws-amplify/cli-core';
import {
  getHomeDir,
  loadSharedConfigFiles,
} from '@smithy/shared-ini-file-loader';
import { fromIni } from '@aws-sdk/credential-providers';
import { EOL } from 'os';
import { Open } from '../open/open.js';
import fs from 'fs/promises';
import { join } from 'path';

const amplifyInstallUrl = 'https://docs.amplify.aws/cli/start/install/';
const defaultProfile = 'default';

type ConfigProfileOptions = {
  profile: string;
  region: string;
};

type CredentialProfileOptions = {
  profile: string;
  accessKeyId: string;
  secretAccessKey: string;
};

/**
 * Command to configure AWS Amplify profile.
 */
export class ConfigureCommand implements CommandModule<object> {
  /**
   * @inheritDoc
   */
  readonly command: string;

  /**
   * @inheritDoc
   */
  readonly describe: string;

  /**
   * Set sandbox secret command.
   */
  constructor() {
    this.command = 'configure';
    this.describe = 'Configure an AWS Amplify profile';
  }

  /**
   * @inheritDoc
   */
  handler = async (): Promise<void> => {
    const configFiles = await loadSharedConfigFiles({
      ignoreCache: true,
    });
    if (
      Object.keys(configFiles.configFile).length !== 0 ||
      Object.keys(configFiles.credentialsFile).length !== 0
    ) {
      console.log(
        `Local AWS profile file(s) detected!${EOL}Follow the instructions at ${amplifyInstallUrl}${EOL}to configure Amplify IAM user and credentials.${EOL}Use "aws configure" to complete the profile setup.${EOL}`
      );
      return;
    }
    const hasIAMUser = await AmplifyPrompter.yesOrNo({
      message: 'Do you already have an IAM User?',
    });

    if (!hasIAMUser) {
      console.log(
        `Follow the instructions at ${amplifyInstallUrl}${EOL}to configure Amplify IAM user and credentials.${EOL}`
      );

      await Open.open(amplifyInstallUrl, { wait: false });
      await AmplifyPrompter.input({
        message: `Hit [enter] when complete`,
      });
    }

    const accessKeyId = await AmplifyPrompter.secretValue(
      'Enter Access Key ID:'
    );
    const secretAccessKey = await AmplifyPrompter.secretValue(
      'Enter Secret Access Key:'
    );

    console.log(
      `This would update/create the AWS Profile in your local machine`
    );
    const profile = await AmplifyPrompter.input({
      message: 'Enter Profile Name:',
    });
    const region = await AmplifyPrompter.input({
      message: 'Enter Region:',
    });

    await this.createAWSConfigFile({
      profile,
      region,
    });

    await this.createAWSCredentialFile({
      profile,
      accessKeyId,
      secretAccessKey,
    });
    console.log(`Created profile ${profile} successfully!`);
  };

  private createAWSConfigFile = async (options: ConfigProfileOptions) => {
    let configData =
      options.profile === defaultProfile
        ? `[${options.profile}]${EOL}`
        : `[profile ${options.profile}]${EOL}`;
    configData += `region = ${options.region}`;

    const filePath =
      process.env.AWS_CONFIG_FILE ?? join(getHomeDir(), '.aws', 'config');
    await fs.appendFile(filePath, configData);

    // validate after write. It is to ensure this function is compatible with the current AWS format.
    const profileData = await loadSharedConfigFiles({
      ignoreCache: true,
    });
    const retrievedRegion = profileData.configFile?.[options.profile]?.region;
    if (retrievedRegion !== options.region) {
      throw new Error(`Failed to configure the AWS config file`);
    }
  };

  private createAWSCredentialFile = async (
    options: CredentialProfileOptions
  ) => {
    let credentialData = `[${options.profile}]${EOL}`;
    credentialData += `aws_access_key_id = ${options.accessKeyId}${EOL}`;
    credentialData += `aws_secret_access_key = ${options.secretAccessKey}${EOL}`;

    const filePath =
      process.env.AWS_SHARED_CREDENTIALS_FILE ??
      join(getHomeDir(), '.aws', 'credentials');
    await fs.appendFile(filePath, credentialData);

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

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv => {
    return yargs;
  };
}
