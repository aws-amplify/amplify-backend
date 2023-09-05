import { Options, execa } from 'execa';
import readline from 'readline';
import { CONTROL_C, commandMacros } from './command_macros.js';
import { LineActionQueueBuilder } from './line_action_queue_builder.js';

/**
 * Provides an abstractions for sending and receiving data on stdin/out of a child process
 *
 * The general strategy is a builder pattern which appends actions to a queue
 * Then when .run() is called, the child process is spawned and the actions are executed one by one
 *
 * Each action is essentially a condition to wait for stdout to satisfy and some data to send on stdin once the wait condition is met
 *
 * For example `.waitForLineIncludes('Do you like M&Ms').sendLine('yes')`
 * will wait until a line that includes "Do you like M&Ms" is printed on stdout of the child process,
 * then send "yes" on stdin of the process
 */
export class ProcessController {
  private readonly actions: LineActionQueueBuilder =
    new LineActionQueueBuilder();
  /**
   * Private ctor that initializes a readline interface around the execa process
   */
  constructor(
    private readonly command: string,
    private readonly args: string[] = [],
    private readonly options?: Pick<Options, 'cwd'>
  ) {}

  do = (name: keyof typeof commandMacros) => {
    this.actions.append(commandMacros[name]);
    return this;
  };

  /**
   * Execute the sequence of actions queued on the process
   */
  run = async () => {
    const actionQueue = this.actions.getLineActionQueue();
    const execaProcess = execa(this.command, this.args, this.options);

    if (process.stdout) {
      void execaProcess.pipeStdout?.(process.stdout);
    }

    if (!execaProcess.stdout) {
      throw new Error('Child process does not have stdout stream');
    }
    const reader = readline.createInterface(execaProcess.stdout);

    for await (const line of reader) {
      const expectedLine = actionQueue[0];
      if (!expectedLine?.predicate(line)) {
        continue;
      }
      // if we got here, the line matched the predicate
      for (const chunk of expectedLine.thenSend) {
        if (chunk === CONTROL_C) {
          execaProcess.kill('SIGINT');
        } else {
          execaProcess.stdin?.write(chunk);
        }
      }
      actionQueue.shift();
    }

    await execaProcess;
  };
}

/**
 * Factory function that returns a ProcessController for the Amplify CLI
 */
export const amplifyCli = (args: string[] = [], dir: string) =>
  new ProcessController('amplify', args, { cwd: dir });
