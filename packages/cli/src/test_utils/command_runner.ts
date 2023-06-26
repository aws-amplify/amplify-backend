import { Argv } from 'yargs';

/**
 * Runs commands given preconfigured yargs parser.
 */
export class TestCommandRunner {
  private readonly parser: Argv;

  /**
   * Creates new command runner.
   */
  constructor(parser: Argv) {
    // Make sure we don't exit process on error or --help
    this.parser = parser.exitProcess(false);
  }

  /**
   * Runs a command. Returns command output or throws an error if command failed.
   */
  runCommand = async (args: string | Array<string>): Promise<string> => {
    return await new Promise((resolve, reject) => {
      this.parser.parse(args, {}, (err, argv, output) => {
        if (err) {
          reject(err);
        } else {
          resolve(output);
        }
      });
    });
  };
}
