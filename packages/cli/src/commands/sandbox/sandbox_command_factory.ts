import { CommandModule } from 'yargs';
import { SandboxCommand, SandboxCommandOptions } from './sandbox_command.js';
import { SandboxSingletonFactory } from '@aws-amplify/sandbox';
import { SandboxDeleteCommand } from './sandbox-delete/sandbox_delete_command.js';
import { SandboxIdResolver } from './sandbox_id_resolver.js';
import { CwdPackageJsonLoader } from '../../cwd_package_json_loader.js';
import { ClientConfigGeneratorAdapter } from '../../client-config/client_config_generator_adapter.js';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { LocalAppNameResolver } from '../../backend-identifier/local_app_name_resolver.js';
import { createSandboxSecretCommand } from './sandbox-secret/sandbox_secret_command_factory.js';
import { SandboxBackendIdentifier } from '@aws-amplify/platform-core';
import { SandboxEventHandlerFactory } from './sandbox_event_handler_factory.js';
import { CommandMiddleware } from '../../command_middleware.js';

/**
 * Creates wired sandbox command.
 */
export const createSandboxCommand = (): CommandModule<
  object,
  SandboxCommandOptions
> => {
  const credentialProvider = fromNodeProviderChain();
  const sandboxIdResolver = new SandboxIdResolver(
    new LocalAppNameResolver(new CwdPackageJsonLoader())
  );
  const sandboxFactory = new SandboxSingletonFactory(sandboxIdResolver.resolve);
  const clientConfigGeneratorAdapter = new ClientConfigGeneratorAdapter(
    credentialProvider
  );
  const getBackendIdentifier = async (appName?: string) => {
    const sandboxId = appName ?? (await sandboxIdResolver.resolve());
    return new SandboxBackendIdentifier(sandboxId);
  };

  const eventHandlerFactory = new SandboxEventHandlerFactory(
    getBackendIdentifier
  );

  const commandMiddleWare = new CommandMiddleware();
  return new SandboxCommand(
    sandboxFactory,
    [new SandboxDeleteCommand(sandboxFactory), createSandboxSecretCommand()],
    clientConfigGeneratorAdapter,
    commandMiddleWare,
    eventHandlerFactory.getSandboxEventHandlers
  );
};
