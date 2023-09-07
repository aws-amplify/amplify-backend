import { Options, execa } from 'execa';
import readline from 'readline';
import { CONTROL_C } from './stdio_interaction_macros.js';
import { StdioInteractionQueueBuilder } from './stdio_interaction_queue_builder.js';

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
  private readonly interactions: StdioInteractionQueueBuilder =
    new StdioInteractionQueueBuilder();
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

  do = (interactions: StdioInteractionQueueBuilder) => {
    this.interactions.append(interactions);
    return this;
  };

  /**
   * Execute the sequence of actions queued on the process
   */
  run = async () => {
    const interactionQueue = this.interactions.getStdioInteractionQueue();
    const execaProcess = execa(this.command, this.args, this.options);

    if (process.stdout) {
      void execaProcess.pipeStdout?.(process.stdout);
    }

    if (!execaProcess.stdout) {
      throw new Error('Child process does not have stdout stream');
    }
    const reader = readline.createInterface(execaProcess.stdout);

    for await (const line of reader) {
      const currentInteraction = interactionQueue[0];
      if (!currentInteraction?.predicate(line)) {
        continue;
      }
      // if we got here, the line matched the predicate
      // now we need to send the payload of the action (if any)
      if (typeof currentInteraction.payload === 'string') {
        if (currentInteraction.payload === CONTROL_C) {
          execaProcess.kill('SIGINT');
        } else {
          execaProcess.stdin?.write(currentInteraction.payload);
        }
      }
      // advance the queue
      interactionQueue.shift();
    }

    await execaProcess;
  };
}

/**
 * Factory function that returns a ProcessController for the Amplify CLI
 */
export const amplifyCli = (args: string[] = [], dir: string) =>
  new ProcessController('amplify', args, { cwd: dir });
