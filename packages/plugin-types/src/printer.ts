import { COLOR } from './colors.js';

export type RecordValue = string | number | string[] | Date;

export enum LogLevel {
  ERROR = 0,
  INFO = 1,
  DEBUG = 2,
}

export type Printer = {
  printRecords: <T extends Record<string | number, RecordValue>>(
    ...objects: T[]
  ) => void;
  print: (message: string, colorName?: COLOR) => void;
  printNewLine: () => void;
  log: (message: string, level?: LogLevel, eol?: boolean) => void;
  indicateProgress: (
    message: string,
    callback: () => Promise<void>
  ) => Promise<void>;
};
