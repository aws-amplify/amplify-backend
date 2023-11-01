import { Argv, CommandModule } from 'yargs';
import { AmplifyPrompter, Printer } from '@aws-amplify/cli-core';
import { DEFAULT_PROFILE } from '@smithy/shared-ini-file-loader';
import { EOL } from 'os';
import { Open } from '../open/open.js';
import { ArgumentsKebabCase } from '../../kebab_case.js';
import { ProfileController } from './profile_controller.js';

const amplifyInstallUrl = 'https://docs.amplify.aws/cli/start/install/';
const awsConfigureUrl =
  'https://docs.aws.amazon.com/cli/latest/userguide/getting-started-quickstart.html#getting-started-quickstart-new-command';

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
  handler = async (args: ConfigureProfileCommandOptions): Promise<void> => {
    const profileName = args.name;
    const profileExists = await this.profileController.profileExists(
      profileName
    );
    if (profileExists) {
      Printer.print(
        `Profile '${profileName}' already exists!${EOL}Follow the instructions at ${amplifyInstallUrl} to configure an Amplify IAM User.${EOL}Use "aws configure" to complete the profile setup:${EOL}${awsConfigureUrl}${EOL}`
      );
      return;
    }
    const hasIAMUser = await AmplifyPrompter.yesOrNo({
      message: 'Do you already have IAM User credentials?',
    });

    if (!hasIAMUser) {
      Printer.print(
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

    const region = await AmplifyPrompter.input({
      message: `Enter the AWS region to use with the '${profileName}' profile (eg us-east-1, us-west-2, etc):`,
    });

    await this.profileController.appendAWSFiles({
      profile: profileName,
      region,
      accessKeyId,
      secretAccessKey,
    });

    Printer.print(`Created profile ${profileName} successfully!`);
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
