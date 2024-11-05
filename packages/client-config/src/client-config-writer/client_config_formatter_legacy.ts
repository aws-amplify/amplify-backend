import {
  ClientConfig,
  ClientConfigFormat,
} from '../client-config-types/client_config.js';
import os from 'os';
import { ClientConfigMobileConverter } from './client_config_to_mobile_legacy_converter.js';
import { ClientConfigLegacyConverter } from './client_config_to_legacy_converter.js';
import { ClientConfigFormatter } from './client_config_formatter.js';

/**
 * Formats client config to desired format.
 */
export class ClientConfigFormatterLegacy implements ClientConfigFormatter {
  /**
   * Creates new client config formatter.
   */
  constructor(private readonly configConverter: ClientConfigMobileConverter) {}

  format = (clientConfig: ClientConfig, format: ClientConfigFormat): string => {
    // This library only generates unified ClientConfig but older version of frontend libraries only support legacy format. So we convert it first.
    const legacyConfig =
      new ClientConfigLegacyConverter().convertToLegacyConfig(clientConfig);

    switch (format) {
      case ClientConfigFormat.TS:
      case ClientConfigFormat.MJS: {
        return `const amplifyConfig = ${JSON.stringify(legacyConfig, null, 2)}${
          os.EOL
        }export default amplifyConfig;${os.EOL}`;
      }
      case ClientConfigFormat.DART: {
        // Using raw string, i.e. r''' to disable Dart's interpolations
        // because we're using special characters like $ in some outputs.
        return `const amplifyConfig = r'''${JSON.stringify(
          this.configConverter.convertToMobileConfig(legacyConfig),
          null,
          2
        )}''';`;
      }
      case ClientConfigFormat.JSON_MOBILE:
        return JSON.stringify(
          this.configConverter.convertToMobileConfig(legacyConfig),
          null,
          2
        );
      case ClientConfigFormat.JSON:
        return JSON.stringify(legacyConfig, null, 2);
      default:
        throw new Error(`Unknown client config format`);
    }
  };
}
