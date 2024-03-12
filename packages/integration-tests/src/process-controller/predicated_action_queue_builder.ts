import {
  ActionType,
  PredicateType,
  PredicatedAction,
} from './predicated_action.js';
import os from 'os';
import fs from 'fs/promises';

import { killExecaProcess } from './execa_process_killer.js';
import { ExecaChildProcess } from 'execa';
import { CopyDefinition } from './types.js';

export const CONTROL_C = '\x03';
/**
 * Builder for a queue of Actions
 */
export class PredicatedActionBuilder {
  private readonly predicatedActionQueue: PredicatedAction[] = [];

  /**
   * Append the action queue from another builder to this builder
   */
  append = (builder: PredicatedActionBuilder) => {
    this.predicatedActionQueue.push(...builder.getPredicatedActionQueue());
    return this;
  };

  /**
   * Add a new predicated action to the queue with a predicate that matches a given string
   */
  waitForLineIncludes = (str: string) => {
    this.predicatedActionQueue.push({
      ifThis: {
        predicateType: PredicateType.MATCHES_STRING_PREDICATE,
        predicate: (line) => line.includes(str),
      },
    });
    return this;
  };

  /**
   * Adds a wait for ms milliseconds
   */
  waitFor = async (ms: number) => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  };

  /**
   * Update the last predicated action to send str to the running process with no newline
   */
  send = (str: string) => {
    this.getLastPredicatedAction().then = {
      actionType:
        str === CONTROL_C
          ? ActionType.KILL_PROCESS
          : ActionType.SEND_INPUT_TO_PROCESS,
      action: async (execaProcess: ExecaChildProcess) => {
        if (str === CONTROL_C) {
          await killExecaProcess(execaProcess);
        } else {
          execaProcess.stdin?.write(str);
        }
      },
    };
    return this;
  };

  /**
   * Update the last predicated action to update backend code by copying files from
   * `from` location to `to` location.
   */
  replaceFiles = (replacements: CopyDefinition[]) => {
    this.getLastPredicatedAction().then = {
      actionType: ActionType.UPDATE_FILE_CONTENT,
      action: async () => {
        for (const { source, destination } of replacements) {
          await fs.cp(source, destination, {
            recursive: true,
          });
        }
      },
    };
    return this;
  };

  /**
   * Update the last predicated action to validate that the deployment time is less than the one specified
   */
  ensureDeploymentTimeLessThan = (seconds: number) => {
    this.getLastPredicatedAction().then = {
      actionType: ActionType.ASSERT_ON_PROCESS_OUTPUT,
      action: (strWithDeploymentTime: string) => {
        // the time can be in fractional or whole seconds. 24.3, 24, 24.22 etc.
        const regex = /^✨ {2}Total time: (\d*\.*\d*)s.*$/;
        const deploymentTime = strWithDeploymentTime.match(regex);
        if (
          deploymentTime &&
          deploymentTime.length > 1 &&
          !isNaN(+deploymentTime[1])
        ) {
          if (+deploymentTime[1] <= seconds) {
            return;
          }
          throw new Error(
            `Deployment time ${+deploymentTime[1]} seconds is higher than the threshold of ${seconds}`
          );
        } else {
          throw new Error(
            `Could not determine the deployment time. String was ${strWithDeploymentTime}`
          );
        }
      },
    };
    return this;
  };

  /**
   * Send line with a newline at the end
   */
  sendLine = (line: string) => {
    this.send(`${line}${os.EOL}`);
    return this;
  };

  /**
   * Send `N\n`
   */
  sendNo = () => {
    this.sendLine('N');
    return this;
  };

  /**
   * Send `Y\n`
   */
  sendYes = () => {
    this.sendLine('Y');
    return this;
  };

  /**
   * Send SIGINT to the child process
   */
  sendCtrlC = () => {
    this.send(CONTROL_C);
    return this;
  };

  /**
   * Get the currently queued actions
   */
  getPredicatedActionQueue = (): PredicatedAction[] => {
    return this.predicatedActionQueue;
  };

  getLastPredicatedAction = () => {
    if (this.predicatedActionQueue.length === 0) {
      throw new Error('Must have a predicate to execute the action');
    }
    // this assertion is safe because we checked the length above
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const lastPredicatedAction = this.predicatedActionQueue.at(-1)!;
    if (typeof lastPredicatedAction.then === 'function') {
      throw new Error(
        'An action is already registered to the last predicate in the queue. Update the same action.'
      );
    }

    return lastPredicatedAction;
  };
}
