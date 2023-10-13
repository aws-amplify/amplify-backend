import { input } from '@inquirer/prompts';

/**
 * Wrapper for prompter library
 * Because @inquirer/prompts library set the methods as non-configurable, we cannot mock the methods directly.
 * see details: https://github.com/orgs/nodejs/discussions/47959
 */
export class AmplifyPrompter {
  /**
   * An input style prompt.
   * @param options for displaying the prompt
   * @param options.message display for the prompt
   * @param options.defaultValue if user submits without typing anything. Default: "."
   * @returns Promise<string> the user input
   */
  static input = async (options: {
    message: string;
    defaultValue?: string;
  }): Promise<string> => {
    const response = await input({
      message: options.message,
      default: options.defaultValue ?? '',
    });
    return response;
  };
}
