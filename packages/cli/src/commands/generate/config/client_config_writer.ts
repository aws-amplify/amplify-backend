import { ClientConfig } from '@aws-amplify/backend-engine';
import fs from 'fs/promises';

/**
 * A class that persists client config to disk.
 */
export class ClientConfigWriter {
  /**
   * Persists provided client config as json file to target path.
   */
  async writeClientConfig(
    clientConfig: ClientConfig,
    targetPath: string
  ): Promise<void> {
    await fs.writeFile(targetPath, JSON.stringify(clientConfig));
  }
}
