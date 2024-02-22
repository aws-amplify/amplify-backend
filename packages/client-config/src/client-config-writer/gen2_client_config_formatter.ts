import {
  ClientConfig,
  ClientConfigFormat,
} from '../client-config-types/client_config.js';
import os from 'os';
import { ClientConfigFormatter } from './client_config_formatter.js';

/**
 * Formats Gen2 client config to desired format
 */
export class Gen2ClientConfigFormatter implements ClientConfigFormatter {
  /**
   * Creates new client config formatter.
   */
  constructor() {}

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
          clientConfig,
          null,
          2
        )}''';`;
      }
      case ClientConfigFormat.JSON_MOBILE:
      case ClientConfigFormat.JSON:
        return JSON.stringify(clientConfig, null, 2);
      default:
        throw new Error(`Unknown client config format`);
    }
  };
}
