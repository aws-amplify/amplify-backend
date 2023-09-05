import { LineAction } from './expected_line_action.js';
import os from 'os';
import { CONTROL_C } from './command_macros.js';

/**
 * Builder for a queue of LineActions
 */
export class LineActionQueueBuilder {
  private readonly lineActionQueue: LineAction[] = [];

  /**
   * Append the action queue from another builder to this builder
   */
  append = (builder: LineActionQueueBuilder) => {
    this.lineActionQueue.push(...builder.getLineActionQueue());
    return this;
  };

  /**
   * Add a new action to the queue to wait for a line that includes str
   */
  waitForLineIncludes = (str: string) => {
    this.lineActionQueue.push({
      predicate: (line) => line.includes(str),
      thenSend: [],
    });
    return this;
  };

  /**
   * Send str with no newline
   */
  send = (str: string) => {
    if (this.lineActionQueue.length === 0) {
      throw new Error('Must wait for a line before sending');
    }
    this.lineActionQueue.at(-1)?.thenSend.push(str);
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
  getLineActionQueue = (): LineAction[] => {
    return this.lineActionQueue;
  };
}
