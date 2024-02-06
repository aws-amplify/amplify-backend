import { LogLevel, Printer } from './printer/printer.js';

const minimumLogLevel = process.argv.includes('--debug')
  ? LogLevel.DEBUG
  : LogLevel.INFO;

export const printer = new Printer(minimumLogLevel);
