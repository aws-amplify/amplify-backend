import { Argv, CommandModule } from 'yargs';
import { AmplifyPrompter, Printer } from '@aws-amplify/cli-core';
import { DEFAULT_PROFILE } from '@smithy/shared-ini-file-loader';
import { EOL } from 'os';
import { Open } from '../open/open.js';
import { ArgumentsKebabCase } from '../../kebab_case.js';
import { ProfileManager } from './profile_writer.js';

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
  constructor(private profileWriter: ProfileManager) {
    this.command = 'profile';
    this.describe = 'Configure an AWS Amplify profile';
  }

  /**
   * @inheritDoc
   */
  handler = async (args: ConfigureProfileCommandOptions): Promise<void> => {
    const profileExists = await this.profileWriter.profileExists(args.profile);
    if (profileExists) {
      Printer.print(
        `Profile '${args.profile}' already exists!${EOL}Follow the instructions at ${amplifyInstallUrl} to configure an Amplify IAM User.${EOL}Use "aws configure" to complete the profile setup:${EOL}${awsConfigureUrl}${EOL}`
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

    Printer.print(
      `This would update/create the AWS Profile '${args.profile}' in your local machine`
    );

    const region = await AmplifyPrompter.input({
      message:
        'Set the AWS region for this profile (eg us-east-1, us-west-2, etc):',
    });

    await this.profileWriter.appendAWSConfigFile({
      profile: args.profile,
      region,
    });

    await this.profileWriter.appendAWSCredentialFile({
      profile: args.profile,
      accessKeyId,
      secretAccessKey,
    });
    Printer.print(`Created profile ${args.profile} successfully!`);
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<ConfigureProfileCommandOptions> => {
    return yargs.option('profile', {
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
  profile: string;
};
