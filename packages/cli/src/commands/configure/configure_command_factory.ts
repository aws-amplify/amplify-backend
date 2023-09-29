import { CommandModule } from 'yargs';
import { ConfigureCommand } from './configure_command.js';
import { ConfigureProfileCommand } from './profile/configure_profile_command.js';
import { ProfileConfiguration } from '@aws-amplify/configure-profile';

/**
 * Creates wired generate command.
 */
export const createConfigureCommand = (): CommandModule => {
  const configureProfileCommand = new ConfigureProfileCommand(
    new ProfileConfiguration()
  );

  return new ConfigureCommand(configureProfileCommand);
};
