import { FrontendConfigRegistry } from './frontend_config_registry.js';

/**
 * Type for an object that can set entries in a FrontendConfigRegistry
 */
export type FrontendConfigValuesProvider = {
  provideFrontendConfigValues(registry: FrontendConfigRegistry): void;
};
