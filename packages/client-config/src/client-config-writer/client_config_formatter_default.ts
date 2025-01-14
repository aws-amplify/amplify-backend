import {
  ClientConfig,
  ClientConfigFormat,
} from '../client-config-types/client_config.js';
import { ClientConfigFormatter } from './client_config_formatter.js';

/**
 * Formats client config to desired format
 */
export class ClientConfigFormatterDefault implements ClientConfigFormatter {
  /**
   * Creates new client config formatter.
   */
  constructor() {}

  format = (clientConfig: ClientConfig, format: ClientConfigFormat): string => {
    switch (format) {
      case ClientConfigFormat.DART: {
        // Using raw string, i.e. r''' to disable Dart's interpolations
        // because we're using special characters like $ in some outputs.
        return `const amplifyConfig = r'''${JSON.stringify(
          clientConfig,
          null,
          2
        )}''';`;
      }
      case ClientConfigFormat.JSON:
        return JSON.stringify(clientConfig, null, 2);
      default:
        throw new Error(
          `Unsupported client config format ${format} for client config`
        );
    }
  };
}
