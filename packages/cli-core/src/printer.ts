import { ConsolePrinter } from './printer/console_printer.js';
import { LogLevel } from './printer/printer.js';

export const minimumLogLevel = process.argv.includes('--debug')
  ? LogLevel.DEBUG
  : LogLevel.INFO;

export const printer = new ConsolePrinter(minimumLogLevel);
