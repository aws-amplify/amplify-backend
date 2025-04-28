import { CloudWatchLogEvent } from '@aws-amplify/platform-core';
import { ColorName } from '../format/format.js';

// create an exportable type definition from Printer class without using instanceof
export type Printer = {
  print: (message: string) => void;
  printNewLine: () => void;
  log: (message: string, level?: LogLevel) => void;
  logCloudWatch: (
    tag: string,
    event: CloudWatchLogEvent,
    color?: ColorName,
  ) => void;
  logMarkdown: (message: string) => void;
  indicateProgress: (
    message: string,
    callback: () => Promise<void>,
    successMessage?: string,
  ) => Promise<void>;
  startSpinner: (message: string, options?: { timeoutSeconds: number }) => void;
  stopSpinner: (successMessage?: string) => void;
  isSpinnerRunning: () => boolean;
  updateSpinner: (options: { message?: string; prefixText?: string }) => void;
  clearConsole: () => void;
};

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}
