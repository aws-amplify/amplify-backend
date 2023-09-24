import { confirm, password } from '@inquirer/prompts';

/**
 * Wrapper for prompter library
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
}
