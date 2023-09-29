import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { ProfileConfiguration } from '@aws-amplify/configure-profile';

//eslint-disable-next-line
export type ConfigureProfileCommandOptions = {};

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
  constructor() {
    this.command = 'config';
    this.describe = 'Configures local AWS profile';
  }

  /**
   * @inheritDoc
   */
  handler = async (
    args: ArgumentsCamelCase<ConfigureProfileCommandOptions>
  ): Promise<void> => {
    await ProfileConfiguration.openDocs();
    // eslint-disable-next-line
    console.log('Enter the access key of the newly created user:');
    // const accessKeyId = await AmplifyPrompter.password({
    //   message: 'accessKeyId',
    //   validateFn: (input: string) => {
    //     if (input.length < 16 || input.length > 128 || !/^[\w]+$/.test(input)) {
    //       return 'You must enter a valid accessKeyId that contains 16-128 characters comprising of letters, numbers, or underscores.';
    //     }
    //     return true;
    //   },
    // });
    // const secretAccessKey = await AmplifyPrompter.password({
    //   message: 'secretAccessKey',
    //   validateFn: (input) => {
    //     if (input.trim().length === 0) {
    //       return 'You must enter a valid secretAccessKey';
    //     }
    //     return true;
    //   },
    // });
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<ConfigureProfileCommandOptions> => {
    return yargs;
  };
}
