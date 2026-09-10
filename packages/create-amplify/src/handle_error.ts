import { LogLevel, format, printer } from '@aws-amplify/cli-core';

/**
 * Ctrl+C during a prompt rejects with an ExitPromptError from the prompt
 * library. The intent to exit is explicit, so there is nothing to report.
 * Matched on the message rather than the type so that this package does not
 * take a direct dependency on the prompt library, the same way the CLI's
 * error handler does it.
 */
const isUserForceClosePromptError = (err: unknown): boolean =>
  err instanceof Error && err.message.includes('User force closed the prompt');

/**
 * Reports a failure of the create flow, then marks the process as failed.
 * A prompt the customer cancelled is not reported, but the exit code is still
 * non-zero because no project was created.
 */
export const handleError = (err: unknown): void => {
  if (!isUserForceClosePromptError(err)) {
    printer.log(format.error(err), LogLevel.ERROR);
  }
  process.exitCode = 1;
};
