import { CommandModule } from 'yargs';
import { fileURLToPath } from 'url';
import {
  SandboxCommand,
  SandboxCommandOptionsKebabCase,
} from './sandbox_command.js';
import { SandboxSingletonFactory } from '@aws-amplify/sandbox';
import { SandboxDeleteCommand } from './sandbox-delete/sandbox_delete_command.js';
import { SandboxBackendIdResolver } from './sandbox_id_resolver.js';
import { ClientConfigGeneratorAdapter } from '../../client-config/client_config_generator_adapter.js';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { LocalNamespaceResolver } from '../../backend-identifier/local_namespace_resolver.js';
import { createSandboxSecretCommand } from './sandbox-secret/sandbox_secret_command_factory.js';
import {
  PackageJsonReader,
  UsageDataEmitterFactory,
} from '@aws-amplify/platform-core';
import { SandboxEventHandlerFactory } from './sandbox_event_handler_factory.js';
import { CommandMiddleware } from '../../command_middleware.js';
import { printer } from '@aws-amplify/cli-core';

/**
 * Creates wired sandbox command.
 */
export const createSandboxCommand = (): CommandModule<
  object,
  SandboxCommandOptionsKebabCase
> => {
  const credentialProvider = fromNodeProviderChain();
  const sandboxBackendIdPartsResolver = new SandboxBackendIdResolver(
    new LocalNamespaceResolver(new PackageJsonReader())
  );

  const sandboxFactory = new SandboxSingletonFactory(
    sandboxBackendIdPartsResolver.resolve,
    printer
  );
  const clientConfigGeneratorAdapter = new ClientConfigGeneratorAdapter(
    credentialProvider
  );

  const libraryVersion =
    new PackageJsonReader().read(
      fileURLToPath(new URL('../../../package.json', import.meta.url))
    ).version ?? '';

  const eventHandlerFactory = new SandboxEventHandlerFactory(
    sandboxBackendIdPartsResolver.resolve,
    async () => await new UsageDataEmitterFactory().getInstance(libraryVersion)
  );

  const commandMiddleWare = new CommandMiddleware(printer);
  return new SandboxCommand(
    sandboxFactory,
    [new SandboxDeleteCommand(sandboxFactory), createSandboxSecretCommand()],
    clientConfigGeneratorAdapter,
    commandMiddleWare,
    eventHandlerFactory.getSandboxEventHandlers
  );
};
