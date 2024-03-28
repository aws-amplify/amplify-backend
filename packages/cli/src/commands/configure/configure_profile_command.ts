import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { AmplifyPrompter, printer } from '@aws-amplify/cli-core';
import { DEFAULT_PROFILE } from '@smithy/shared-ini-file-loader';
import { EOL } from 'os';
import { Open } from '../open/open.js';
import { ArgumentsKebabCase } from '../../kebab_case.js';
import { ProfileController } from './profile_controller.js';

const configureAccountUrl =
  'https://docs.amplify.aws/gen2/start/account-setup/';

const profileSetupInstruction = `Follow the instructions at ${configureAccountUrl}${EOL}to configure Amplify IAM user and credentials.${EOL}`;

/**
 * Command to configure AWS Amplify profile.
 */
export class ConfigureProfileCommand
  implements CommandModule<object, ConfigureProfileCommandOptions>
{
  /**
   * @inheritDoc
   */
  readonly command: string;

  /**
   * @inheritDoc
   */
  readonly describe: string;

  /**
   * Configure profile command.
   */
  constructor(private readonly profileController: ProfileController) {
    this.command = 'profile';
    this.describe = 'Configure an AWS Amplify profile';
  }

  /**
   * @inheritDoc
   */
  handler = async (
    args: ArgumentsCamelCase<ConfigureProfileCommandOptions>
  ): Promise<void> => {
    const profileName = args.name;
    const profileExists = await this.profileController.profileExists(
      profileName
    );
    if (profileExists) {
      printer.print(
        `Profile '${profileName}' already exists!${EOL}${profileSetupInstruction}`
      );
      return;
    }
    const hasIAMUser = await AmplifyPrompter.yesOrNo({
      message: 'Do you already have IAM User credentials?',
    });

    if (!hasIAMUser) {
      printer.print(profileSetupInstruction);

      await Open.open(configureAccountUrl, { wait: false });
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

    const region = await AmplifyPrompter.input({
      message: `Enter the AWS region to use with the '${profileName}' profile (eg us-east-1, us-west-2, etc):`,
    });

    await this.profileController.createOrAppendAWSFiles({
      profile: profileName,
      region,
      accessKeyId,
      secretAccessKey,
    });

    printer.print(`Created profile ${profileName} successfully!`);
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<ConfigureProfileCommandOptions> => {
    return yargs.option('name', {
      describe: 'An AWS profile name',
      type: 'string',
      array: false,
      default: DEFAULT_PROFILE,
    });
  };
}

export type ConfigureProfileCommandOptions =
  ArgumentsKebabCase<ConfigureProfileCommandOptionsCamelCase>;

type ConfigureProfileCommandOptionsCamelCase = {
  name: string;
};
