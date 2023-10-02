import { Argv, CommandModule } from 'yargs';
import { ProfileConfiguration } from '@aws-amplify/configure-profile';
import { AmplifyPrompter } from '../../prompter/amplify_prompts.js';

//eslint-disable-next-line
export type ConfigureProfileCommandOptions = {};

const ACCESS_KEY_ID_PROMPT_MESSAGE = 'accessKeyId';
const SECRET_ACCESS_KEY_PROMPT_MESSAGE = 'secretAccessKey';
const AWS_REGION_PROMPT_MESSAGE = 'Specify the AWS region';

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
    // 1. Open documentation site for setting up IAM user with managed policy and security credentials
    await this.profileConfiguration.openDocs();

    // eslint-disable-next-line
    console.log('Enter the access key of the newly created user:');

    // 2. Input access key id
    const accessKeyId = await AmplifyPrompter.secretValue(
      ACCESS_KEY_ID_PROMPT_MESSAGE,
      (value: string) => {
        if (value.length < 16 || value.length > 128 || !/^[\w]+$/.test(value)) {
          return ACCESS_KEY_ID_VALIDATION_MESSAGE;
        }
        return true;
      }
    );

    // 3. Input secret access key
    const secretAccessKey = await AmplifyPrompter.secretValue(
      SECRET_ACCESS_KEY_PROMPT_MESSAGE,
      (input: string) => {
        if (input.trim().length === 0) {
          return SECRET_ACCESS_KEY_VALIDATION_MESSAGE;
        }
        return true;
      }
    );

    // 4. Select region
    const region = await AmplifyPrompter.select({
      message: AWS_REGION_PROMPT_MESSAGE,
      choices: this.profileConfiguration
        .getRegions()
        .map((region: string) => ({ value: region })),
    });

    // 5. Configure profile using above info
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
