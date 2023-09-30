import { confirm, password, select } from '@inquirer/prompts';

export type Choice = {
  // can extend this to other properties as required.
  value: string;
};

export type PasswordPromptOptions = {
  message: string;
  validate: (value: string) => boolean | string;
};

export type SelectPromptOptions = {
  message: string;
  choices: Choice[];
};
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

  /**
   * A password prompt
   * @param options An options object for configuring password prompt
   * @param options.message Message for the prompt
   * @param options.validate Function to validate the password input
   * @returns the password as a string
   */
  static password = (options: PasswordPromptOptions): Promise<string> => {
    const { message, validate } = options;
    return password({
      message,
      validate,
    });
  };

  /**
   * A select prompt
   * @param options An options object for configuring select prompt
   * @param options.message A message for the select prompt
   * @param options.choices Choices for the prompt
   * @returns the selection as a string
   */
  static select = (options: SelectPromptOptions): Promise<string> => {
    const { message, choices } = options;
    return select({
      message,
      choices,
    });
  };
}
