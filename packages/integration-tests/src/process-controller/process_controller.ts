import { Options, execa } from 'execa';
import readline from 'readline';
import { CONTROL_C } from './controller_action_macros.js';
import { ControllerActionQueueBuilder } from './controller_action_queue_builder.js';

/**
 * Provides an abstractions for sending and receiving data on stdin/out of a child process
 *
 * The general strategy is to read stdout of the child process line by line and consume a queue of actions as output is ingested.
 *
 * When .run() is called, the child process is spawned and the actions are awaited and executed one by one
 *
 * Each action is essentially a condition to wait for stdout to satisfy and some data to send on stdin once the wait condition is met
 *
 * For example `.waitForLineIncludes('Do you like M&Ms').sendLine('yes')`
 * will wait until a line that includes "Do you like M&Ms" is printed on stdout of the child process,
 * then send "yes" on stdin of the process
 */
export class ProcessController {
  private readonly actions: ControllerActionQueueBuilder =
    new ControllerActionQueueBuilder();
  /**
   * Initialize a process controller for the specified command and args.
   *
   * The command is not executed until .run() is awaited
   *
   * To define actions that the controller should perform on the child process, use .do() before calling .run()
   */
  constructor(
    private readonly command: string,
    private readonly args: string[] = [],
    private readonly options?: Pick<Options, 'cwd'>
  ) {}

  do = (actions: ControllerActionQueueBuilder) => {
    this.actions.append(actions);
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
      const currentAction = actionQueue[0];
      if (!currentAction?.predicate(line)) {
        continue;
      }
      // if we got here, the line matched the predicate
      // now we need to send the payload of the action (if any)
      if (typeof currentAction.thenSend === 'string') {
        if (currentAction.thenSend === CONTROL_C) {
          execaProcess.kill('SIGINT');
        } else {
          execaProcess.stdin?.write(currentAction.thenSend);
        }
      }
      // advance the queue
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
