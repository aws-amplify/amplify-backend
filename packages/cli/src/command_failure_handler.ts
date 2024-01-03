import { Argv } from 'yargs';
import { Printer } from '@aws-amplify/cli-core';
import { handleError } from './error_handler.js';

/**
 * Generates a function that is intended to be used as a callback to yargs.fail()
 * All logic for actually handling errors should be delegated to handleError.
 *
 * For some reason the yargs object that is injected into the fail callback does not include all methods on the Argv type
 * This generator allows us to inject the yargs parser into the callback so that we can call parser.exit() from the failure handler
 * This prevents our top-level error handler from being invoked after the yargs error handler has already been invoked
 */
export const generateCommandFailureHandler = (
  parser: Argv
): ((message: string, error: Error) => void) => {
  /**
   * Format error output when a command fails
   * @param message error message set by the yargs:check validations
   * @param error error thrown by yargs handler
   */
  const handleCommandFailure = (message: string, error: Error) => {
    const printHelp = () => {
      Printer.printNewLine();
      parser.showHelp();
      Printer.printNewLine();
    };

    handleError(error, printHelp, message);
    parser.exit(1, error);
  };
  return handleCommandFailure;
};
