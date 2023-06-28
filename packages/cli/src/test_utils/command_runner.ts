import { Argv } from 'yargs';

/**
 * An error that has both output and error that occurred during command execution.
 */
export class TestCommandError extends Error {
  /**
   * Creates new test command error.
   */
  constructor(readonly error: Error, readonly output: string) {
    super();
  }
}

/**
 * Runs commands given preconfigured yargs parser.
 */
export class TestCommandRunner {
  private readonly parser: Argv;

  /**
   * Creates new command runner.
   */
  constructor(parser: Argv) {
    this.parser = parser
      // Override script name to avoid long test file names
      .scriptName('amplify')
      // Make sure we don't exit process on error or --help
      .exitProcess(false);
  }

  /**
   * Runs a command. Returns command output or throws an error if command failed.
   */
  runCommand = async (args: string | Array<string>): Promise<string> => {
    return await new Promise((resolve, reject) => {
      this.parser.parse(args, {}, (err, argv, output) => {
        if (err) {
          reject(new TestCommandError(err, output));
        } else {
          resolve(output);
        }
      });
    });
  };
}
