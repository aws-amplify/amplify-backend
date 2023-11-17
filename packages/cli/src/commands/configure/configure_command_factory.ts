import { CommandModule } from 'yargs';
import { ConfigureProfileCommand } from './configure_profile_command.js';
import { ProfileController } from './profile_controller.js';
import { ConfigureCommand } from './configure_command.js';
import { ConfigureTelemetryCommand } from './telemetry/configure_telemetry_command.js';
import { ConfigController } from './telemetry/config_controller.js';
/**
 * Creates a configure command.
 */
export const createConfigureCommand = (): CommandModule<object> => {
  const profileController = new ProfileController();
  const configureProfileCommand = new ConfigureProfileCommand(
    profileController
  );
  const configureTelemetryCommand = new ConfigureTelemetryCommand(
    new ConfigController()
  );

  return new ConfigureCommand([
    configureProfileCommand as unknown as CommandModule,
    configureTelemetryCommand as unknown as CommandModule,
  ]);
};
