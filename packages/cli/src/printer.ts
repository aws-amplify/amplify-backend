import { LogLevel, Printer } from '@aws-amplify/cli-core';

const minimumLogLevel = process.argv.includes('--debug')
  ? LogLevel.DEBUG
  : LogLevel.INFO;

export const printer = new Printer(minimumLogLevel);
