import { confirm, input, password } from '@inquirer/prompts';

/**
 * Wrapper for prompter library
 * Because @inquirer/prompts library set the methods as non-configurable, we cannot mock the methods directly.
 * see details: https://github.com/orgs/nodejs/discussions/47959
 */
export class AmplifyPrompter {
  /**
   * A confirm style prompt. Styles question as `y/N`
   * @param options for displaying the prompt
   * @param options.message display for the prompt
   * @param options.defaultValue if user submits without typing anything. Defaults false
   * @returns the boolean answer
   */
  static yesOrNo = async (options: {
    message: string;
    defaultValue?: boolean;
  }): Promise<boolean> => {
    const response = await confirm({
      message: options.message,
      transformer: (value: boolean) => (value ? 'y' : 'N'),
      default: options.defaultValue ?? false,
    });
    return response;
  };

  /**
   * A secret prompt.
   */
  static secretValue = async (
    promptMessage = 'Enter secret value'
  ): Promise<string> => {
    return await password({
      message: promptMessage,
      validate: (val: string) =>
        val && val.length > 0 ? true : 'Cannot be empty',
    });
  };

  /**
   * An input style prompt.
   * @param options for displaying the prompt
   * @param options.message display for the prompt
   * @param options.defaultValue if user submits without typing anything. Default: "."
   * @param options.required if the user input is required, incompatible with options.defaultValue
   * @returns Promise<string> the user input
   */
  static input = async (
    options:
      | {
          message: string;
          required?: never;
          defaultValue?: string;
        }
      | {
          message: string;
          required: true;
          defaultValue?: never;
        }
  ): Promise<string> => {
    if (options.required) {
      return input({
        message: options.message,
        validate: (val: string) =>
          val && val.length > 0 ? true : 'Cannot be empty',
      });
    }
    return input({
      message: options.message,
      default: options.defaultValue ?? '',
    });
  };
}
