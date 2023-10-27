import { CommandModule } from 'yargs';
import { ConfigureCommand } from './configure_command.js';
/**
 * Creates pipeline deploy command
 */
export const createConfigureCommand = (): CommandModule<object> => {
  return new ConfigureCommand();
};
