import fsp from 'fs/promises';
import { ClientConfig } from '../client-config-types/client_config.js';
import path from 'path';
import * as os from 'os';

/**
 * A class that persists client config to disk.
 */
export class ClientConfigWriter {
  /**
   * Persists provided client config as json file to target path.
   */
  writeClientConfig = async (
    clientConfig: ClientConfig,
    targetPath: string
  ): Promise<void> => {
    const fileExtension = path.parse(targetPath).ext;
    switch (fileExtension) {
      case '.ts':
      case '.js': {
        const fileContent = `const amplifyConfig = ${JSON.stringify(
          clientConfig,
          null,
          2
        )}${os.EOL}export default amplifyConfig;${os.EOL}`;
        await fsp.writeFile(targetPath, fileContent);
        break;
      }
      case '.json':
        await fsp.writeFile(targetPath, JSON.stringify(clientConfig, null, 2));
        break;
      default:
        throw new Error(
          `Unknown client config file extension ${fileExtension}`
        );
    }
  };
}
