import { Argv } from 'yargs';
import { AsyncLocalStorage } from 'node:async_hooks';

class OutputInterceptor {
  private output = '';
  append = (chunk: string) => {
    this.output += chunk;
  };
  getOutput = () => this.output;
}

const asyncLocalStorage = new AsyncLocalStorage<OutputInterceptor>();

// Casting original write to Function to disable compiler safety intentionally.
// The process.stdout.write has many overloads and it's impossible to get right types here.
// We're passing unchanged argument list to original method, therefore this is safe.
// eslint-disable-next-line @typescript-eslint/ban-types
const createInterceptedWrite = (originalWrite: Function) => {
  return (...args: never[]) => {
    const interceptor: OutputInterceptor | undefined =
      asyncLocalStorage.getStore();
    if (interceptor) {
      if (args && args.length > 0 && typeof args[0] === 'string') {
        interceptor.append(args[0]);
      }
    }

    return originalWrite(...args);
  };
};
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = createInterceptedWrite(originalStdoutWrite);

const originalStderrWrite = process.stderr.write.bind(process.stderr);
process.stderr.write = createInterceptedWrite(originalStderrWrite);

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
    const interceptor = new OutputInterceptor();
    try {
      const localParser = this.parser;
      await asyncLocalStorage.run(interceptor, () => {
        return localParser.parseAsync(args);
      });
      return interceptor.getOutput();
    } catch (err) {
      throw new TestCommandError(err as Error, interceptor.getOutput());
    }
  };
}
