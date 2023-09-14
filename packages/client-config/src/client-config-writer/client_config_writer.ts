import fs from 'fs';
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
    if (fs.existsSync(targetPath)) {
      throw new Error(`File ${targetPath} already exists`);
    }
    switch (fileExtension) {
      case '.ts':
      case '.js': {
        const fileContent = `export default ${JSON.stringify(
          clientConfig,
          null,
          2
        )}${os.EOL}`;
        if (!fs.existsSync(path.dirname(targetPath))) {
          fs.writeFileSync(targetPath, fileContent);
        }
        break;
      }
      case '.json':
        if (!fs.existsSync(path.dirname(targetPath))) {
          fs.writeFileSync(targetPath, JSON.stringify(clientConfig, null, 2));
        }
        break;
      default:
        throw new Error(
          `Unknown client config file extension ${fileExtension}`
        );
    }
  };
}
