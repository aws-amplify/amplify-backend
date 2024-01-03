import { COLOR, Printer } from '@aws-amplify/cli-core';
import { InvalidCredentialError } from './error/credential_error.js';
import { EOL } from 'os';

/**
 * Root level error handling for uncaught errors during CLI command execution
 */
export const handleError = (
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
