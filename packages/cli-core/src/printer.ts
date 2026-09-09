import { LogLevel, Printer } from './printer/printer.js';

export const minimumLogLevel = process.argv.includes('--debug')
  ? LogLevel.DEBUG
  : LogLevel.INFO;

export const printer = new Printer(minimumLogLevel);
