import { confirm } from '@inquirer/prompts';

/**
 * Wrapper for prompter library
 */
export class AmplifyPrompter {
  /**
   * A confirm style prompt. Styles question as `y/N`
   * @param options parameters for displaying the prompt
   * @param options.message message display for the prompt
   * @param options.defaultValue if user presses enter without typing anything. Defaults false
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
}
