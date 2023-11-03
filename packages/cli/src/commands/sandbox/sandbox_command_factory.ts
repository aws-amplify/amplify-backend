import { CommandModule } from 'yargs';
import { SandboxCommand, SandboxCommandOptions } from './sandbox_command.js';
import { SandboxSingletonFactory } from '@aws-amplify/sandbox';
import { SandboxDeleteCommand } from './sandbox-delete/sandbox_delete_command.js';
import { SandboxIdResolver } from './sandbox_id_resolver.js';
import { CwdPackageJsonLoader } from '../../cwd_package_json_loader.js';
import { ClientConfigGeneratorAdapter } from '../../client-config/client_config_generator_adapter.js';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { LocalBackendIdResolver } from '../../backend-identifier/local_backend_id_resolver.js';
import { createSandboxSecretCommand } from './sandbox-secret/sandbox_secret_command_factory.js';
import { SandboxBackendIdentifier } from '@aws-amplify/platform-core';
import { SandboxEventHandlerFactory } from './sandbox_event_handler_factory.js';

/**
 * Creates wired sandbox command.
 */
export const createSandboxCommand = (): CommandModule<
  object,
  SandboxCommandOptions
> => {
  const credentialProvider = fromNodeProviderChain();
  const sandboxIdResolver = new SandboxIdResolver(
    new LocalBackendIdResolver(new CwdPackageJsonLoader())
  );

  /**
   * This callback allows sandbox to resolve the backend id using the name specified by the --name arg if present
   * Otherwise, the default sandboxIdResolver.resolve() value is used
   * @param sandboxName A customer specified name to use as part of the sandbox identifier (the --name arg to sandbox)
   */
  const sandboxBackendIdentifierResolver = async (sandboxName?: string) => {
    const sandboxId = await sandboxIdResolver.resolve();
    if (!sandboxName) {
      return sandboxId;
    }
    return new SandboxBackendIdentifier(sandboxId.backendId, sandboxName);
  };

  const sandboxFactory = new SandboxSingletonFactory(
    sandboxBackendIdentifierResolver
  );
  const clientConfigGeneratorAdapter = new ClientConfigGeneratorAdapter(
    credentialProvider
  );

  const eventHandlerFactory = new SandboxEventHandlerFactory(
    sandboxBackendIdentifierResolver
  );

  return new SandboxCommand(
    sandboxFactory,
    [new SandboxDeleteCommand(sandboxFactory), createSandboxSecretCommand()],
    clientConfigGeneratorAdapter,
    eventHandlerFactory.getSandboxEventHandlers
  );
};
