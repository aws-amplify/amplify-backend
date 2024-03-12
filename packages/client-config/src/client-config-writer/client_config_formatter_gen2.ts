import {
  ClientConfig,
  ClientConfigFormat,
} from '../client-config-types/client_config.js';
import { ClientConfigFormatter } from './client_config_formatter.js';

/**
 * Formats Gen2 client config to desired format
 */
export class ClientConfigFormatterGen2 implements ClientConfigFormatter {
  /**
   * Creates new client config formatter.
   */
  constructor() {}

  format = (clientConfig: ClientConfig, format: ClientConfigFormat): string => {
    switch (format) {
      case ClientConfigFormat.DART: {
        return `const amplifyConfig = '''${JSON.stringify(
          clientConfig,
          null,
          2
        )}''';`;
      }
      case ClientConfigFormat.JSON:
        return JSON.stringify(clientConfig, null, 2);
      default:
        throw new Error(
          `Unsupported client config format ${format} for Gen2 client config`
        );
    }
  };
}
