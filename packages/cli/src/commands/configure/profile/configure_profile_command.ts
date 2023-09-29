import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { ProfileConfiguration } from '@aws-amplify/configure-profile';
import { AmplifyPrompter } from '../../prompter/amplify_prompts.js';

//eslint-disable-next-line
export type ConfigureProfileCommandOptions = {};

const ACCESS_KEY_ID_VALIDATION_MESSAGE =
  'You must enter a valid accessKeyId that contains 16-128 characters comprising of letters, numbers, or underscores.';
const SECRET_ACCESS_KEY_VALIDATION_MESSAGE =
  'You must enter a valid secretAccessKey';
/**
 * Command that generates client config.
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
   * Creates client config generation command.
   */
  constructor(private readonly profileConfiguration: ProfileConfiguration) {
    this.command = 'profile';
    this.describe = 'Configures local AWS profile';
  }

  /**
   * @inheritDoc
   */
  handler = async (): Promise<void> => {
    await this.profileConfiguration.openDocs();
    // eslint-disable-next-line
    console.log('Enter the access key of the newly created user:');
    const accessKeyId = await AmplifyPrompter.password({
      message: 'accessKeyId',
      validate: (value: string) => {
        if (value.length < 16 || value.length > 128 || !/^[\w]+$/.test(value)) {
          return ACCESS_KEY_ID_VALIDATION_MESSAGE;
        }
        return true;
      },
    });

    const secretAccessKey = await AmplifyPrompter.password({
      message: 'secretAccessKey',
      validate: (input) => {
        if (input.trim().length === 0) {
          return SECRET_ACCESS_KEY_VALIDATION_MESSAGE;
        }
        return true;
      },
    });

    const region = await AmplifyPrompter.select({
      message: 'Specify the AWS region',
      choices: this.profileConfiguration
        .getRegions()
        .map((region: string) => ({ value: region })),
    });

    await this.profileConfiguration.configure({
      accessKeyId,
      secretAccessKey,
      region,
    });
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<ConfigureProfileCommandOptions> => {
    return yargs;
  };
}
