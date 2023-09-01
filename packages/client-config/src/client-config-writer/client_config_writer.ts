import fs from 'fs/promises';
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
    const { dir, ext, name } = path.parse(targetPath);
    switch (ext) {
      case '.js': {
        const configContent = JSON.stringify(clientConfig, null, 2);
        const configFileContent = `export default ${configContent}${os.EOL}`;
        const moduleTargetPath = `${dir}/${name}.d.ts`;
        const moduleConfigFileContent = `export interface AmplifyConfiguration ${configContent};${os.EOL}declare const amplifyConfiguration: AmplifyConfiguration;${os.EOL}export default amplifyConfiguration;${os.EOL}`;
        await Promise.all([
          fs.writeFile(targetPath, configFileContent),
          fs.writeFile(moduleTargetPath, moduleConfigFileContent),
        ]);
        break;
      }
      case '.json':
        await fs.writeFile(targetPath, JSON.stringify(clientConfig, null, 2));
        break;
      default:
        throw new Error(`Unknown client config file extension ${ext}`);
    }
  };
}
