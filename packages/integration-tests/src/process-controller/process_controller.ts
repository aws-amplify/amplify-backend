import { Options, execa, execaSync } from 'execa';
import readline from 'readline';
import { PredicatedActionBuilder } from './predicated_action_queue_builder.js';
import { ActionType } from './predicated_action.js';
import { killExecaProcess } from './execa_process_killer.js';
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
  private readonly interactions: PredicatedActionBuilder =
    new PredicatedActionBuilder();
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
    private readonly options?: Pick<Options, 'cwd' | 'env'>
  ) {}

  do = (interactions: PredicatedActionBuilder) => {
    this.interactions.append(interactions);
    return this;
  };

  /**
   * Execute the sequence of actions queued on the process
   */
  run = async () => {
    const interactionQueue = this.interactions.getPredicatedActionQueue();
    const execaProcess = execa(this.command, this.args, {
      reject: false,
      ...this.options,
    });
    let errorThrownFromActions = undefined;
    let expectKilled = false;
    if (typeof execaProcess.pid !== 'number') {
      throw new Error('Could not determine child process id');
    }

    if (process.stdout) {
      void execaProcess.pipeStdout?.(process.stdout);
    }

    if (process.stderr) {
      void execaProcess.pipeStderr?.(process.stderr);
    }

    if (!execaProcess.stdout) {
      throw new Error('Child process does not have stdout stream');
    }
    const reader = readline.createInterface(execaProcess.stdout);

    for await (const line of reader) {
      const currentInteraction = interactionQueue[0];
      try {
        // For now we only have one predicate type. If we add more predicate types in the future, we will have to
        // turn this into a predicate executor (Similar to the switch-case for actions below)
        if (currentInteraction?.ifThis.predicate(line)) {
          switch (currentInteraction.then?.actionType) {
            case ActionType.SEND_INPUT_TO_PROCESS:
              await currentInteraction.then.action(execaProcess);
              break;
            case ActionType.KILL_PROCESS:
              expectKilled = true;
              await currentInteraction.then.action(execaProcess);
              break;
            case ActionType.UPDATE_FILE_CONTENT:
              await currentInteraction.then.action();
              break;
            case ActionType.ASSERT_ON_PROCESS_OUTPUT:
              currentInteraction.then.action(line);
              break;
            default:
              break;
          }
        } else {
          continue;
        }
      } catch (error) {
        await killExecaProcess(execaProcess);
        execaProcess.stdin?.write('N');
        errorThrownFromActions = error;
      }
      // advance the queue
      interactionQueue.shift();
    }

    const result = await execaProcess;

    if (errorThrownFromActions) {
      throw errorThrownFromActions;
    } else if (result.failed && !expectKilled) {
      throw new Error(result.stdout);
    }
  };
}

/**
 * Factory function that returns a ProcessController for the Amplify CLI
 */
export const amplifyCli = (
  args: string[] = [],
  dir: string,
  options?: {
    env?: Record<string, string>;
  }
): ProcessController => {
  // TODO This is a workaround to lookup locally installed binary as seen by npx
  // We're using binary directly because signals (Ctrl+C) don't propagate
  // to child processes without TTY emulator.
  // See: https://github.com/aws-amplify/amplify-backend/issues/582
  const command = execaSync('npx', ['which', 'amplify'], {
    cwd: dir,
  }).stdout.trim();
  if (!command) {
    throw new Error('Unable to locate amplify binary');
  }
  return new ProcessController(command, args, {
    cwd: dir,
    env: options?.env,
  });
};
