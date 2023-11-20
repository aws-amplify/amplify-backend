import { LocalConfigurationController } from '../config/local_configuration_controller.js';

export type ConfigurationController = {
  get: <T>(path: string) => Promise<T>;
  set: (path: string, value: string | boolean | number) => Promise<void>;
  clear: () => Promise<void>;
  write: () => Promise<void>;
};

export type LocalConfigurationFileName = 'usage_data_preferences.json';

/**
 * Instantiates LocalConfigurationController
 */
export class ConfigurationControllerFactory {
  private controllers: Record<string, ConfigurationController>;

  /**
   * initialized empty map of ConfigurationController;
   */
  constructor() {
    this.controllers = {};
  }
  /**
   * Returns a LocalConfigurationController
   */
  getInstance = (
    configFileName: LocalConfigurationFileName
  ): ConfigurationController => {
    if (this.controllers[configFileName]) {
      return this.controllers[configFileName];
    }

    this.controllers[configFileName] = new LocalConfigurationController(
      'amplify',
      configFileName
    );
    return this.controllers[configFileName];
  };
}

export const configControllerFactory = new ConfigurationControllerFactory();
