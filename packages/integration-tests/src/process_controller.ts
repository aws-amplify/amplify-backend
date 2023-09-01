/**
 *
 */
import { ExecaChildProcess, Options, execa } from 'execa';
import * as os from 'os';
import * as readline from 'readline';
import { Interface } from 'readline';

/**
 * Provides an abstractions for sending and receiving data on stdin/out of a child process
 */
export class ProcessController {
  private readonly processInterface: Interface;
  /**
   * Private ctor that initializes a readline interface around the execa process
   */
  private constructor(private readonly execaProcess: ExecaChildProcess) {
    if (!execaProcess.stdout || !execaProcess.stdin) {
      throw new Error(`Process does not have stdout and stdin`);
    }
    // We are creating an interface with the child process stdout as the input and stdin as the output
    // This is because the _output_ of the child process in the input that we want to process here
    // and the _input_ of the child process is where we want to send commands (the output from this controller)
    this.processInterface = readline.createInterface(
      execaProcess.stdout,
      execaProcess.stdin
    );
    this.processInterface.pause();
  }

  /**
   * Factory method to initialize with a command and args
   */
  static fromCommand = (
    command: string,
    args: string[] = [],
    options?: Pick<Options, 'cwd'>
  ) => {
    return new ProcessController(execa(command, args, options));
  };

  send = (str: string) => {
    this.processInterface.write(str);
    return this;
  };

  sendLine = (line: string) => {
    this.send(`${line}${os.EOL}`);
    return this;
  };

  waitForLineIncludes = async (expected: string) => {
    // attach a line listener that will wait until the expected line is found
    // once found, it will pause the input stream and remove itself from the line listeners
    const foundExpectedStringPromise = new Promise<void>((resolve) => {
      const selfRemovingListener = (line: string) => {
        if (line.includes(expected)) {
          this.processInterface.pause();
          this.processInterface.removeListener('line', selfRemovingListener);
          resolve();
        }
      };
      this.processInterface.on('line', selfRemovingListener);
    });

    // now that the line listener is attached, we can resume the input stream
    this.processInterface.resume();

    // wait for the line to be found
    await foundExpectedStringPromise;
    return this;
  };

  kill = () => {
    this.execaProcess.kill();
  };
}
