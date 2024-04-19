import {
  PackageJsonReader,
  UsageDataEmitterFactory,
  configControllerFactory,
} from '@aws-amplify/platform-core';
import { CommandModule } from 'yargs';
import { ConfigureProfileCommand } from './configure_profile_command.js';
import { ProfileController } from './profile_controller.js';
import { ConfigureCommand } from './configure_command.js';
import { ConfigureTelemetryCommand } from './telemetry/configure_telemetry_command.js';
import { fileURLToPath } from 'url';
/**
 * Creates a configure command.
 */
export const createConfigureCommand = (): CommandModule<object> => {
  const libraryVersion =
    new PackageJsonReader().read(
      fileURLToPath(new URL('../../../package.json', import.meta.url))
    ).version ?? '';

  const profileController = new ProfileController();

  const configureProfileCommand = new ConfigureProfileCommand(
    profileController,
    () => new UsageDataEmitterFactory().getInstance(libraryVersion)
  );
  const configureTelemetryCommand = new ConfigureTelemetryCommand(
    configControllerFactory.getInstance('usage_data_preferences.json')
  );

  return new ConfigureCommand([
    configureProfileCommand as unknown as CommandModule,
    configureTelemetryCommand as unknown as CommandModule,
  ]);
};
