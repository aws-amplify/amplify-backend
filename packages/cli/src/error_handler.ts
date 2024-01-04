import { COLOR, Printer } from '@aws-amplify/cli-core';
import { InvalidCredentialError } from './error/credential_error.js';
import { EOL } from 'os';
import { Argv } from 'yargs';

/**
 * Attaches process listeners to handle unhandled exceptions and rejections
 */
export const attachUnhandledExceptionListeners = (): void => {
  process.on('unhandledRejection', (reason) => {
    if (reason instanceof Error) {
      handleError(reason);
    } else if (typeof reason === 'string') {
      handleError(new Error(reason));
    } else {
      throw new Error(`Cannot handle rejection of type ${typeof reason}`);
    }
  });

  process.on('uncaughtException', (error) => {
    handleError(error);
  });
};

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

/**
 * Root level error handling for uncaught errors during CLI command execution
 */
const handleError = (
  error: Error,
  printMessagePreamble?: () => void,
  message?: string
) => {
  process.exitCode = 1;

  if (isUserForceClosePromptError(error)) {
    return;
  }

  if (error instanceof InvalidCredentialError) {
    Printer.print(`${error.message}${EOL}`, COLOR.RED);
    return;
  }

  printMessagePreamble?.();
  Printer.print(message || String(error), COLOR.RED);
  Printer.printNewLine();
};

const isUserForceClosePromptError = (err: Error): boolean => {
  return err?.message.includes('User force closed the prompt');
};
