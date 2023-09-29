import { CommandModule } from 'yargs';
import { ConfigureCommand } from './configure_command.js';
import { ConfigureProfileCommand } from './profile/configure_profile_command.js';

/**
 * Creates wired generate command.
 */
export const createConfigureCommand = (): CommandModule => {
  const configureProfileCommand = new ConfigureProfileCommand();

  return new ConfigureCommand(configureProfileCommand);
};
