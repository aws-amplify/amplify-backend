import { Argv } from 'yargs';
import { LogLevel, format, printer } from '@aws-amplify/cli-core';
import { hideBin } from 'yargs/helpers';
/**
 Executes the command using the provided parser.
 Handles any errors that occur during command execution.
 @param parser - The parser object to parse the command line arguments.
 @returns - A promise that resolves when the command execution is complete.
 */
export const parseAsyncSafe = async (parser: Argv): Promise<void> => {
  try {
    await parser.parseAsync(hideBin(process.argv));
    // Yargs invoke the command failure handler before rethrowing the error.This prevents it from propagating to unhandled exception handler and being printed again.
  } catch (e) {
    if (e instanceof Error) {
      printer.log(format.error('Failed to execute command'), LogLevel.DEBUG);
      printer.log(format.error(e), LogLevel.DEBUG);
      if (e.stack) {
        printer.log(e.stack, LogLevel.DEBUG);
      }
    }
  }
};
