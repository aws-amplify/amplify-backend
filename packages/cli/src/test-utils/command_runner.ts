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
      // Pin locale
      .locale('en')
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
      // This trick allows us to capture output and errors in memory.
      // In order to trigger this behavior a parseCallback must be passed to either parse or parseAsync.
      void this.parser.parse(args, {}, (err, argv, output) => {
        if (err) {
          reject(new TestCommandError(err, output));
        } else {
          resolve(output);
        }
      });
    });
  };
}
