import {
  ClientConfig,
  ClientConfigFormat,
} from '../client-config-types/client_config.js';
import os from 'os';

/**
 * Formats client config to desired format.
 */
export class ClientConfigFormatter {
  format = (clientConfig: ClientConfig, format: ClientConfigFormat): string => {
    switch (format) {
      case ClientConfigFormat.TS:
      case ClientConfigFormat.MJS: {
        return `const amplifyConfig = ${JSON.stringify(clientConfig, null, 2)}${
          os.EOL
        }export default amplifyConfig;${os.EOL}`;
      }
      case ClientConfigFormat.DART: {
        return `final Map<String, dynamic> amplifyConfig = ${JSON.stringify(
          clientConfig,
          null,
          2
        )}`;
      }
      case ClientConfigFormat.JSON:
        return JSON.stringify(clientConfig, null, 2);
      default:
        throw new Error(`Unknown client config format ${format}`);
    }
  };
}
