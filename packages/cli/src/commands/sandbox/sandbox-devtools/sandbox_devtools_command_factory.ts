import { CommandModule } from 'yargs';
import { SandboxDevToolsCommand } from './sandbox_devtools_command.js';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';
import { LocalNamespaceResolver } from '../../../backend-identifier/local_namespace_resolver.js';
import { PackageJsonReader } from '@aws-amplify/platform-core';
import { SandboxSingletonFactory } from '@aws-amplify/sandbox';
import { SDKProfileResolverProvider } from '../../../sdk_profile_resolver_provider.js';
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
  // Create the sandbox backend ID resolver
  const sandboxBackendIdResolver = new SandboxBackendIdResolver(
    new LocalNamespaceResolver(new PackageJsonReader()),
  );

  // Create the sandbox factory
  const sandboxFactory = new SandboxSingletonFactory(
    sandboxBackendIdResolver.resolve,
    new SDKProfileResolverProvider().resolve,
    printer,
    format,
  );

  // Create the AWS clients
  const s3Client = new S3Client();
  const amplifyClient = new AmplifyClient();
  const cloudFormationClient = new CloudFormationClient();

  // Create the AWS client provider
  const awsClientProvider = {
    getS3Client: () => s3Client,
    getAmplifyClient: () => amplifyClient,
    getCloudFormationClient: () => cloudFormationClient,
  };

  // Create the port checker
  const portChecker = new PortChecker();

  // Create and return the command
  return new SandboxDevToolsCommand(
    sandboxBackendIdResolver,
    sandboxFactory,
    awsClientProvider,
    portChecker,
    format,
    printer,
  );
};
