import {
  ClientConfigFormat,
  ClientConfigVersion,
  getClientConfigFileName,
  getClientConfigPath,
} from '@aws-amplify/client-config';
import { ClientConfigGeneratorAdapter } from './client_config_generator_adapter.js';
import { DeployedBackendIdentifier } from '@aws-amplify/deployed-backend-client';
import fsp from 'fs/promises';

/**
 * Life cycle handler for client config files written to file system
 */
export class ClientConfigLifecycleHandler {
  /**
   * Instantiate a new life cycle handler which proxy requests to ClientConfigGeneratorAdapter
   */
  constructor(
    private clientConfigGeneratorAdapter: ClientConfigGeneratorAdapter,
    private readonly version: ClientConfigVersion,
    private readonly outDir?: string,
    private readonly format?: ClientConfigFormat
  ) {}

  generateClientConfigFile = async (
    backendIdentifier: DeployedBackendIdentifier
  ) => {
    await this.clientConfigGeneratorAdapter.generateClientConfigToFile(
      backendIdentifier,
      this.version,
      this.outDir,
      this.format
    );
  };

  deleteClientConfigFile = async () => {
    const fileName = getClientConfigFileName(this.version);
    const path = await getClientConfigPath(fileName, this.outDir, this.format);
    await fsp.rm(path);
  };
}
