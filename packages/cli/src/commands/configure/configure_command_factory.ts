import { CommandModule } from 'yargs';
import { ConfigureProfileCommand } from './configure_profile_command.js';
import { ProfileController } from './profile_controller.js';
import { ConfigureCommand } from './configure_command.js';
/**
 * Creates a configure command.
 */
export const createConfigureCommand = (): CommandModule<object> => {
  const profileController = new ProfileController();
  const configureProfileCommand = new ConfigureProfileCommand(
    profileController
  );

  return new ConfigureCommand([
    configureProfileCommand as unknown as CommandModule,
  ]);
};
