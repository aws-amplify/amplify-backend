import { generateClientConfig } from './generate_client_config.js';
import { ClientConfigWriter } from './client-config-writer/client_config_writer.js';
import {
  ClientConfigFormat,
  ClientConfigVersion,
  ClientConfigVersionOption,
  GenerateClientConfigToFileResult,
} from './client-config-types/client_config.js';
import { getClientConfigPath } from './paths/index.js';
import { DeployedBackendIdentifier } from '@aws-amplify/deployed-backend-client';
import { ClientConfigMobileConverter } from './client-config-writer/client_config_to_mobile_legacy_converter.js';
import { fileURLToPath } from 'url';
import * as fsp from 'fs/promises';
import { ClientConfigFormatterLegacy } from './client-config-writer/client_config_formatter_legacy.js';
import { ClientConfigFormatterDefault } from './client-config-writer/client_config_formatter_default.js';
import { getClientConfigFileName } from './paths/get_client_config_name.js';
import { AWSClientProvider } from '@aws-amplify/plugin-types';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { S3Client } from '@aws-sdk/client-s3';

/**
 * Main entry point for generating client config and writing to a file
 */
export const generateClientConfigToFile = async (
  awsClientProvider: AWSClientProvider<{
    getS3Client: S3Client;
    getAmplifyClient: AmplifyClient;
    getCloudFormationClient: CloudFormationClient;
  }>,
  backendIdentifier: DeployedBackendIdentifier,
  version: ClientConfigVersion,
  outDir?: string,
  format?: ClientConfigFormat
): Promise<GenerateClientConfigToFileResult> => {
  const packageJson = await readPackageJson();

  const isLegacyConfig = version === ClientConfigVersionOption.V0;

  const clientConfigWriter = new ClientConfigWriter(
    getClientConfigPath,
    getClientConfigFileName,
    isLegacyConfig
      ? new ClientConfigFormatterLegacy(
          new ClientConfigMobileConverter(packageJson.name, packageJson.version)
        )
      : new ClientConfigFormatterDefault()
  );

  const clientConfig = await generateClientConfig(
    awsClientProvider,
    backendIdentifier,
    version
  );

  return await clientConfigWriter.writeClientConfig(
    clientConfig,
    version,
    outDir,
    format
  );
};

const readPackageJson = async (): Promise<{
  name: string;
  version: string;
}> => {
  const packageJsonPath = fileURLToPath(
    new URL('../package.json', import.meta.url)
  );
  return JSON.parse(await fsp.readFile(packageJsonPath, 'utf-8'));
};
