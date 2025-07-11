import { CommandModule } from 'yargs';
import { SandboxDevToolsCommand } from './sandbox_devtools_command.js';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';
import { LocalNamespaceResolver } from '../../../backend-identifier/local_namespace_resolver.js';
import { PackageJsonReader } from '@aws-amplify/platform-core';
import { format, printer } from '@aws-amplify/cli-core';
import { S3Client } from '@aws-sdk/client-s3';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { PortChecker } from '../port_checker.js';

/**
 * Creates a wired sandbox devtools command.
 * @returns A CommandModule instance for the sandbox devtools command
 */
export const createSandboxDevToolsCommand = (): CommandModule<
  object,
  object
> => {
  const sandboxBackendIdResolver = new SandboxBackendIdResolver(
    new LocalNamespaceResolver(new PackageJsonReader()),
  );
  const s3Client = new S3Client();
  const amplifyClient = new AmplifyClient();
  const cloudFormationClient = new CloudFormationClient();

  const awsClientProvider = {
    getS3Client: () => s3Client,
    getAmplifyClient: () => amplifyClient,
    getCloudFormationClient: () => cloudFormationClient,
  };

  const portChecker = new PortChecker();

  return new SandboxDevToolsCommand(
    sandboxBackendIdResolver,
    awsClientProvider,
    portChecker,
    format,
    printer,
  );
};
