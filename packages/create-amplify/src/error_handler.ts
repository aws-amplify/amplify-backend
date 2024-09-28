import { LogLevel, format, printer } from '@aws-amplify/cli-core';
import { AmplifyError } from '@aws-amplify/platform-core';

let hasAttachUnhandledExceptionListenersBeenCalled = false;

type HandleErrorProps = {
  error?: Error;
  printMessagePreamble?: () => void;
  message?: string;
};

/**
 * Attaches process listeners to handle unhandled exceptions and rejections
 */
export const attachUnhandledExceptionListeners = (): void => {
  if (hasAttachUnhandledExceptionListenersBeenCalled) {
    return;
  }
  process.on('unhandledRejection', (reason) => {
    process.exitCode = 1;
    if (reason instanceof Error) {
      void handleErrorSafe({ error: reason });
    } else if (typeof reason === 'string') {
      // eslint-disable-next-line amplify-backend-rules/prefer-amplify-errors
      void handleErrorSafe({ error: new Error(reason) });
    } else {
      void handleErrorSafe({
        // eslint-disable-next-line amplify-backend-rules/prefer-amplify-errors
        error: new Error(`Unhandled rejection of type [${typeof reason}]`, {
          cause: reason,
        }),
      });
    }
  });

  process.on('uncaughtException', (error) => {
    process.exitCode = 1;
    void handleErrorSafe({ error });
  });
  hasAttachUnhandledExceptionListenersBeenCalled = true;
};

/**
 * Generates a function that is intended to be used as a callback to yargs.fail()
 * All logic for actually handling errors should be delegated to handleError.
 */
export const generateCommandFailureHandler = (): ((
  message: string,
  error: Error
) => Promise<void>) => {
  /**
   * Format error output when a command fails
   * @param message error message
   * @param error error
   */
  const handleCommandFailure = async (message: string, error?: Error) => {
    await handleErrorSafe({
      error,
      message,
    });
  };
  return handleCommandFailure;
};

const handleErrorSafe = async (props: HandleErrorProps) => {
  try {
    await handleError(props);
  } catch (e) {
    printer.log(format.error(e), LogLevel.DEBUG);
    // no-op should gracefully exit
    return;
  }
};

/**
 * Error handling for uncaught errors during CLI command execution.
 *
 * This should be the one and only place where we handle unexpected errors.
 * This includes console logging, debug logging, metrics recording, etc.
 * (Note that we don't do all of those things yet, but this is where they should go)
 */
const handleError = async ({
  error,
  printMessagePreamble,
  message,
}: HandleErrorProps) => {
  // If yargs threw an error because the customer force-closed a prompt (ie Ctrl+C during a prompt) then the intent to exit the process is clear
  if (isUserForceClosePromptError(error)) {
    return;
  }

  printMessagePreamble?.();

  if (error instanceof AmplifyError) {
    printer.print(format.error(`${error.name}: ${error.message}`));

    if (error.resolution) {
      printer.print(`Resolution: ${error.resolution}`);
    }
    if (error.details) {
      printer.print(`Details: ${error.details}`);
    }
    if (errorHasCauseMessage(error)) {
      printer.print(`Cause: ${error.cause.message}`);
    }
  } else {
    // non-Amplify Error object
    printer.print(format.error(message || String(error)));

    if (errorHasCauseMessage(error)) {
      printer.print(`Cause: ${error.cause.message}`);
    }
  }

  // additional debug logging for the stack traces
  if (error?.stack) {
    printer.log(error.stack, LogLevel.DEBUG);
  }
  if (errorHasCauseStackTrace(error)) {
    printer.log(error.cause.stack, LogLevel.DEBUG);
  }
};

const isUserForceClosePromptError = (err?: Error): boolean => {
  return !!err && err?.message.includes('User force closed the prompt');
};

const errorHasCauseStackTrace = (
  error?: Error
): error is Error & { cause: { stack: string } } => {
  return (
    typeof error?.cause === 'object' &&
    !!error.cause &&
    'stack' in error.cause &&
    typeof error.cause.stack === 'string'
  );
};

const errorHasCauseMessage = (
  error?: Error
): error is Error & { cause: { message: string } } => {
  return (
    typeof error?.cause === 'object' &&
    !!error.cause &&
    'message' in error.cause &&
    typeof error.cause.message === 'string'
  );
};
