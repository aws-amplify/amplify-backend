import { Argv } from 'yargs';

import { COLOR, Printer } from '@aws-amplify/cli-core';

/**
 * Format error output when a command fails by displaying the error message in
 * red color and displaying the message before the help as well.
 * @param msg error message set in the yargs:check validations
 * @param err errors thrown by yargs handlers
 * @param yargs instance of yargs as made available in the builder
 */
export const handleCommandFailure = (msg: string, err: Error, yargs: Argv) => {
  Printer.printNewLine();

  yargs.showHelp();

  Printer.printNewLine();
  Printer.printWithColor(COLOR.RED, msg || String(err));
  Printer.printNewLine();
};
