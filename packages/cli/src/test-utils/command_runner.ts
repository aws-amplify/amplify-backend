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

const originalStdoutWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = (...args) => {
  const interceptor: OutputInterceptor | undefined =
    asyncLocalStorage.getStore();
  if (interceptor) {
    if (args && args.length > 0 && typeof args[0] === 'string') {
      interceptor.append(args[0]);
    }
  }
  // Casting originalStdoutWrite to Function to disable compiler safety intentionally.
  // The process.stdout.write has many overloads and it's impossible to get right types here.
  // We're passing unchanged argument list to original method, therefore this is safe.
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (originalStdoutWrite as Function)(...args);
};

const originalStderrWrite = process.stderr.write.bind(process.stderr);
process.stderr.write = (...args) => {
  const interceptor: OutputInterceptor | undefined =
    asyncLocalStorage.getStore();
  if (interceptor) {
    if (args && args.length > 0 && typeof args[0] === 'string') {
      interceptor.append(args[0]);
    }
  }
  // Casting originalStdoutWrite to Function to disable compiler safety intentionally.
  // The process.stdout.write has many overloads and it's impossible to get right types here.
  // We're passing unchanged argument list to original method, therefore this is safe.
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (originalStderrWrite as Function)(...args);
};

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
      await asyncLocalStorage.run(interceptor, () => {
        return this.parser.parseAsync(args);
      });
      return interceptor.getOutput();
    } catch (err) {
      throw new TestCommandError(err as Error, interceptor.getOutput());
    }
    // return await new Promise((resolve, reject) => {
    //   // This trick allows us to capture output and errors in memory.
    //   // In order to trigger this behavior a parseCallback must be passed to either parse or parseAsync.
    //   void this.parser.parse(args, {}, (err, argv, output) => {
    //     if (err) {
    //       reject(new TestCommandError(err, output));
    //     } else {
    //       resolve(output);
    //     }
    //   });
    // });
  };
}
