import { LineAction } from './expected_line_action.js';
import os from 'os';
import { CONTROL_C } from './command_macros.js';

/**
 *
 */
export class LineActionQueueBuilder {
  private readonly lineActionQueue: LineAction[] = [];

  append = (builder: LineActionQueueBuilder) => {
    this.lineActionQueue.push(...builder.getLineActionQueue());
    return this;
  };

  waitForLineIncludes = (str: string) => {
    this.lineActionQueue.push({
      predicate: (line) => line.includes(str),
      thenSend: [],
    });
    return this;
  };

  send = (str: string) => {
    if (this.lineActionQueue.length === 0) {
      throw new Error('Must wait for a line before sending');
    }
    this.lineActionQueue.at(-1)?.thenSend.push(str);
    return this;
  };

  sendLine = (line: string) => {
    this.send(`${line}${os.EOL}`);
    return this;
  };

  sendNo = () => {
    this.sendLine('N');
    return this;
  };

  sendYes = () => {
    this.sendLine('Y');
    return this;
  };

  sendCtrlC = () => {
    this.send(CONTROL_C);
    return this;
  };

  getLineActionQueue = (): LineAction[] => {
    return this.lineActionQueue;
  };
}
