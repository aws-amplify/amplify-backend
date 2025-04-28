import { LambdaClient } from '@aws-sdk/client-lambda';
import { DevConsoleCommand } from './dev_console_command.js';
/**
 * Creates a dev console command.
 */
export const createDevConsoleCommandFactory = () => {
  return new DevConsoleCommand(new LambdaClient());
};
