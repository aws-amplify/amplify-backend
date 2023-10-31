import { CommandModule } from 'yargs';
import { ConfigureProfileCommand } from './configure_profile_command.js';
import { ProfileManager } from './profile_writer.js';
import { ConfigureCommand } from './configure_command.js';
/**
 * Creates pipeline deploy command
 */
export const createConfigureCommand = (): CommandModule<object> => {
  const profileWriter = new ProfileManager();
  const configureProfileCommand = new ConfigureProfileCommand(profileWriter);

  return new ConfigureCommand([
    configureProfileCommand as unknown as CommandModule,
  ]);
};
