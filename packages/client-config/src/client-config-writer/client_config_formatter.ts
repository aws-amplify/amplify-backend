import {
  ClientConfig,
  ClientConfigFormat,
} from '../client-config-types/client_config.js';
import os from 'os';
import { ClientConfigConverter } from './client_config_converter.js';

/**
 * Formats client config to desired format.
 */
export class ClientConfigFormatter {
  constructor(private readonly configConverter: ClientConfigConverter) {}

  format = (clientConfig: ClientConfig, format: ClientConfigFormat): string => {
    switch (format) {
      case ClientConfigFormat.TS:
      case ClientConfigFormat.MJS: {
        return `const amplifyConfig = ${JSON.stringify(clientConfig, null, 2)}${
          os.EOL
        }export default amplifyConfig;${os.EOL}`;
      }
      case ClientConfigFormat.DART: {
        return `const amplifyConfig = '''${JSON.stringify(
          this.configConverter.convertToMobileConfig(clientConfig),
          null,
          2
        )}''';`;
      }
      case ClientConfigFormat.JSON_MOBILE:
        return JSON.stringify(
          this.configConverter.convertToMobileConfig(clientConfig),
          null,
          2
        );
      case ClientConfigFormat.JSON:
        return JSON.stringify(clientConfig, null, 2);
      default:
        throw new Error(`Unknown client config format`);
    }
  };
}
