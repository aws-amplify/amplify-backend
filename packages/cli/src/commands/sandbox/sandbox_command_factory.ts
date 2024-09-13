import { BackendOutputClientFactory } from '@aws-amplify/deployed-backend-client';
import { CommandModule } from 'yargs';
import { fileURLToPath } from 'node:url';
import { AppBackendIdentifierResolver } from '../../backend-identifier/backend_identifier_resolver.js';
import { BackendIdentifierResolverWithFallback } from '../../backend-identifier/backend_identifier_with_sandbox_fallback.js';
import {
  SandboxCommand,
  SandboxCommandOptionsKebabCase,
} from './sandbox_command.js';
import { SandboxSingletonFactory } from '@aws-amplify/sandbox';
import { SandboxDeleteCommand } from './sandbox-delete/sandbox_delete_command.js';
import { SandboxBackendIdResolver } from './sandbox_id_resolver.js';
import { ClientConfigGeneratorAdapter } from '../../client-config/client_config_generator_adapter.js';
import { LocalNamespaceResolver } from '../../backend-identifier/local_namespace_resolver.js';
import { createSandboxSecretCommand } from './sandbox-secret/sandbox_secret_command_factory.js';
import {
  PackageJsonReader,
  UsageDataEmitterFactory,
} from '@aws-amplify/platform-core';
import { SandboxEventHandlerFactory } from './sandbox_event_handler_factory.js';
import { CommandMiddleware } from '../../command_middleware.js';
import { format, printer } from '@aws-amplify/cli-core';
import { S3Client } from '@aws-sdk/client-s3';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { SandboxSeedCommand } from './sandbox-seed/sandbox_seed_command.js';
import { LambdaClient } from '@aws-sdk/client-lambda';

/**
 * Creates wired sandbox command.
 */
export const createSandboxCommand = (): CommandModule<
  object,
  SandboxCommandOptionsKebabCase
> => {
  const sandboxBackendIdPartsResolver = new SandboxBackendIdResolver(
    new LocalNamespaceResolver(new PackageJsonReader())
  );

  const sandboxFactory = new SandboxSingletonFactory(
    sandboxBackendIdPartsResolver.resolve,
    printer,
    format
  );
  const s3Client = new S3Client();
  const amplifyClient = new AmplifyClient();
  const cloudFormationClient = new CloudFormationClient();

  const awsClientProvider = {
    getS3Client: () => s3Client,
    getAmplifyClient: () => amplifyClient,
    getCloudFormationClient: () => cloudFormationClient,
  };
  const clientConfigGeneratorAdapter = new ClientConfigGeneratorAdapter(
    awsClientProvider
  );

  const libraryVersion =
    new PackageJsonReader().read(
      fileURLToPath(new URL('../../../package.json', import.meta.url))
    ).version ?? '';

  const eventHandlerFactory = new SandboxEventHandlerFactory(
    sandboxBackendIdPartsResolver.resolve,
    async () => await new UsageDataEmitterFactory().getInstance(libraryVersion)
  );

  const namespaceResolver = new LocalNamespaceResolver(new PackageJsonReader());

  const backendIdentifierResolver = new BackendIdentifierResolverWithFallback(
    new AppBackendIdentifierResolver(namespaceResolver),
    new SandboxBackendIdResolver(namespaceResolver)
  );

  const commandMiddleWare = new CommandMiddleware(printer);
  return new SandboxCommand(
    sandboxFactory,
    [
      new SandboxDeleteCommand(sandboxFactory),
      createSandboxSecretCommand(),
      new SandboxSeedCommand(
        backendIdentifierResolver,
        () => BackendOutputClientFactory.getInstance(awsClientProvider),
        new LambdaClient()
      ) as unknown as CommandModule,
    ],
    clientConfigGeneratorAdapter,
    commandMiddleWare,
    eventHandlerFactory.getSandboxEventHandlers
  );
};
