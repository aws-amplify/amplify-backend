import { LogLevel, format, printer } from '@aws-amplify/cli-core';
import { Argv } from 'yargs';
import { AmplifyError, UsageDataEmitter } from '@aws-amplify/platform-core';

let hasAttachUnhandledExceptionListenersBeenCalled = false;

/**
 * Attaches process listeners to handle unhandled exceptions and rejections
 */
export const attachUnhandledExceptionListeners = (
  usageDataEmitter: UsageDataEmitter
): void => {
  if (hasAttachUnhandledExceptionListenersBeenCalled) {
    return;
  }
  process.on('unhandledRejection', (reason) => {
    process.exitCode = 1;
    if (reason instanceof Error) {
      void handleError(reason, undefined, undefined, usageDataEmitter);
    } else if (typeof reason === 'string') {
      void handleError(
        new Error(reason),
        undefined,
        undefined,
        usageDataEmitter
      );
    } else {
      void handleError(
        new Error(`Unhandled rejection of type [${typeof reason}]`, {
          cause: reason,
        }),
        undefined,
        undefined,
        usageDataEmitter
      );
    }
  });

  process.on('uncaughtException', (error) => {
    process.exitCode = 1;
    void handleError(error, undefined, undefined, usageDataEmitter);
  });
  hasAttachUnhandledExceptionListenersBeenCalled = true;
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
  parser: Argv,
  usageDataEmitter: UsageDataEmitter
): ((message: string, error: Error) => Promise<void>) => {
  /**
   * Format error output when a command fails
   * @param message error message set by the yargs:check validations
   * @param error error thrown by yargs handler
   */
  const handleCommandFailure = async (message: string, error?: Error) => {
    // join non-option args to find command that failed
    const subcommand = (await parser.argv)?._.join(' ');

    const printHelp = () => {
      printer.printNewLine();
      parser.showHelp();
      printer.printNewLine();
    };
    await handleError(error, printHelp, message, usageDataEmitter, subcommand);
    parser.exit(1, error || new Error(message));
  };
  return handleCommandFailure;
};

/**
 * Error handling for uncaught errors during CLI command execution.
 *
 * This should be the one and only place where we handle unexpected errors.
 * This includes console logging, debug logging, metrics recording, etc.
 * (Note that we don't do all of those things yet, but this is where they should go)
 */
const handleError = async (
  error?: Error,
  printMessagePreamble?: () => void,
  message?: string,
  usageDataEmitter?: UsageDataEmitter,
  command?: string
) => {
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
    await usageDataEmitter?.emitFailure(error, { command: command ?? '' });
  } else {
    // non-Amplify Error object
    printer.print(format.error(message || String(error)));
    if (errorHasCauseMessage(error)) {
      printer.print(`Cause: ${error.cause.message}`);
    }
    await usageDataEmitter?.emitFailure(AmplifyError.fromError(error), {
      command: command ?? '',
    });
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
