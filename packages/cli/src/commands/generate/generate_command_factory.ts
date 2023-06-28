import { CommandModule } from 'yargs';
import { GenerateCommand } from './generate_command.js';
import { GenerateConfigCommand } from './generate_config_command.js';

/**
 * Creates wired generate command.
 */
export const createGenerateCommand = (): CommandModule => {
  return new GenerateCommand(new GenerateConfigCommand());
};
